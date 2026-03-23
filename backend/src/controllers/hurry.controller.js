const crypto = require("crypto");
const { z } = require("zod");
const {
  createHurryRequest,
  updateHurryRequest,
  getHurryRequest,
  listHurryResponses,
  addHurryResponse,
  getProviderByUserId,
  getProviderById,
  createBooking,
  createNotification,
} = require("../db/repository");
const { publishToUser, publishToAll } = require("../realtime/hub");

const hurryRequestSchema = z.object({
  body: z.object({
    service: z.string().trim().min(2).max(120),
    location: z.string().trim().min(2).max(160),
    budgetMin: z.number().nonnegative().optional(),
    budgetMax: z.number().nonnegative().optional(),
    notes: z.string().trim().max(1000).optional().default(""),
    durationSeconds: z.number().int().positive().max(180).optional().default(30),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const acceptSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const cancelSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const statusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

function isExpired(request) {
  return request.expiresAt && new Date(request.expiresAt) < new Date();
}

async function createHurry(req, res) {
  const { service, location, budgetMin, budgetMax, notes, durationSeconds } = req.validated.body;
  const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

  const hurry = await createHurryRequest({
    id: `hurry_${crypto.randomUUID()}`,
    customerId: req.auth.userId,
    service,
    location,
    budgetMin,
    budgetMax,
    notes,
    status: "pending",
    expiresAt,
  });

  // Broadcast to all active providers; in a real system we'd geo-filter.
  publishToUser(req.auth.userId, "hurry.created", { request: hurry });
  publishToAll("hurry.new", { request: hurry });

  return res.status(201).json({ hurry });
}

async function getStatus(req, res) {
  const hurry = await getHurryRequest(req.validated.params.id);
  if (!hurry) return res.status(404).json({ message: "Hurry request not found" });

  const responses = await listHurryResponses(hurry.id);
  const expired = isExpired(hurry) && hurry.status === "pending";
  const state = expired ? { ...hurry, status: "expired" } : hurry;
  return res.json({ hurry: state, responses });
}

async function cancel(req, res) {
  const hurry = await getHurryRequest(req.validated.params.id);
  if (!hurry) return res.status(404).json({ message: "Hurry request not found" });

  const isOwner = hurry.customerId === req.auth.userId;
  const isAdmin = req.auth.role === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const updated = await updateHurryRequest(hurry.id, { status: "cancelled" });
  publishToUser(hurry.customerId, "hurry.cancelled", { request: updated });
  publishToAll("hurry.cancelled", { request: updated });
  return res.status(204).send();
}

async function accept(req, res) {
  const hurry = await getHurryRequest(req.validated.params.id);
  if (!hurry) return res.status(404).json({ message: "Hurry request not found" });
  if (isExpired(hurry) || hurry.status === "expired") {
    await updateHurryRequest(hurry.id, { status: "expired" });
    return res.status(410).json({ message: "Request expired" });
  }
  if (hurry.status === "cancelled") return res.status(410).json({ message: "Request cancelled" });

  const provider = await getProviderByUserId(req.auth.userId);
  if (!provider) return res.status(403).json({ message: "Provider profile required to accept" });

  await addHurryResponse({
    id: `hresp_${crypto.randomUUID()}`,
    requestId: hurry.id,
    providerId: provider.id,
    providerUserId: req.auth.userId,
    status: "accepted",
  });

  let matched = hurry;
  if (!hurry.matchedProviderId) {
    matched = await updateHurryRequest(hurry.id, { matchedProviderId: provider.id, status: "matched" });

    // Create a booking so the flow continues.
    const booking = await createBooking({
      id: `book_${crypto.randomUUID()}`,
      providerId: provider.id,
      providerUserId: provider.userId,
      customerId: hurry.customerId,
      service: hurry.service,
      scheduledFor: new Date().toISOString(),
      notes: `Auto-created from Hurry Mode. ${hurry.notes || ""}`.trim(),
      status: "requested",
    });

    await createNotification({
      id: `notif_${crypto.randomUUID()}`,
      userId: hurry.customerId,
      fromUserId: provider.userId,
      bookingId: booking.id,
      title: "Provider accepted your Hurry request",
      message: `${provider.name} accepted your request for ${hurry.service}`,
      type: "hurry",
    });

    publishToUser(hurry.customerId, "hurry.accepted", { request: matched, provider, booking });
  } else {
    publishToUser(hurry.customerId, "hurry.accepted", { request: matched, provider });
  }

  publishToUser(provider.userId, "hurry.accepted", { request: matched });

  const responses = await listHurryResponses(hurry.id);
  return res.json({ hurry: matched, responses });
}

module.exports = {
  hurryRequestSchema,
  acceptSchema,
  cancelSchema,
  statusSchema,
  createHurry,
  getStatus,
  cancel,
  accept,
};
