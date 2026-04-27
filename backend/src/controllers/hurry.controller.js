const crypto = require("crypto");
const { z } = require("zod");
const {
  createHurryRequest,
  updateHurryRequest,
  getHurryRequest,
  listHurryResponses,
  addHurryResponse,
  listProviders,
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

  // Target matching providers by (category OR skills) AND location substring
  publishToUser(req.auth.userId, "hurry.created", { request: hurry });

  try {
    const allProviders = await listProviders();

    const normalize = (s) => (s || "").toString().toLowerCase();
    const reqService = normalize(service);
    const reqLocation = normalize(location);

    const matchesProvider = (provider) => {
      const pLocation = normalize(provider.location || "");
      // location must match (substring)
      if (!pLocation.includes(reqLocation)) return false;

      const pCategory = normalize(provider.category || "");
      const pSkills = Array.isArray(provider.skills) ? provider.skills.map(String).join(" ") : String(provider.skills || "");
      const pSkillsNorm = normalize(pSkills);

      const categoryMatch = pCategory && (pCategory === reqService || pCategory.includes(reqService) || reqService.includes(pCategory));
      const skillsMatch = pSkillsNorm && (pSkillsNorm.includes(reqService) || reqService.split(/\s+/).some((tk) => pSkillsNorm.includes(tk)));

      return (categoryMatch || skillsMatch);
    };

    const matched = allProviders.filter(matchesProvider);

    // Publish only to matched providers
    for (const provider of matched) {
      if (provider.userId) {
        publishToUser(provider.userId, "hurry.new", { request: hurry, provider: { id: provider.id, name: provider.name, location: provider.location, priceMin: provider.priceMin } });
      }
    }
  } catch (err) {
    // fallback: broadcast to all if matching fails
    publishToAll("hurry.new", { request: hurry });
  }

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

    const notification = await createNotification({
      id: `notif_${crypto.randomUUID()}`,
      userId: hurry.customerId,
      fromUserId: provider.userId,
      bookingId: booking.id,
      title: "Provider accepted your Hurry request",
      message: `${provider.name} accepted your request for ${hurry.service}`,
      payload: { providerName: provider.name, service: hurry.service, providerCategory: provider.category },
      type: "hurry",
    });

    publishToUser(hurry.customerId, "hurry.accepted", { request: matched, provider, booking });
    publishToUser(hurry.customerId, "notification.new", { notification });
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
