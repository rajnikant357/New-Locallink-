const crypto = require("crypto");
const { z } = require("zod");
const {
  createBooking: persistBooking,
  getProviderById,
  listBookingsForUser,
  getBookingById,
  updateBookingStatus: persistUpdateBookingStatus,
  createNotification,
} = require("../db/repository");
const { publishToUser } = require("../realtime/hub");

const bookingStatus = ["requested", "accepted", "rejected", "completed", "cancelled"];

const createBookingSchema = z.object({
  body: z.object({
    providerId: z.string().min(1),
    service: z.string().trim().min(2).max(120),
    scheduledFor: z.string().datetime(),
    notes: z.string().trim().max(1000).optional().default(""),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(bookingStatus),
  }),
  query: z.object({}).optional(),
});

const listBookingsSchema = z.object({
  query: z.object({
    status: z.enum(bookingStatus).optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

async function createBooking(req, res) {
  const { providerId, service, scheduledFor, notes } = req.validated.body;

  const provider = await getProviderById(providerId);
  if (!provider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  const booking = await persistBooking({
    id: `book_${crypto.randomUUID()}`,
    providerId,
    providerUserId: provider.userId,
    customerId: req.auth.userId,
    service,
    scheduledFor,
    notes,
    status: "requested",
  });

  if (provider.userId) {
    await createNotification({
      id: `notif_${crypto.randomUUID()}`,
      userId: provider.userId,
      bookingId: booking.id,
      title: "New booking request",
      message: `${service} requested for ${new Date(scheduledFor).toLocaleString()}`,
      type: "booking",
    });
    publishToUser(provider.userId, "booking.new", { booking });
    publishToUser(provider.userId, "notification.new", {
      title: "New booking request",
      type: "booking",
      bookingId: booking.id,
    });
  }

  publishToUser(booking.customerId, "booking.new", { booking });

  return res.status(201).json({ booking });
}

async function listMyBookings(req, res) {
  const { status } = req.validated.query;
  const bookings = await listBookingsForUser(req.auth.userId, status);
  return res.json({ bookings });
}

async function updateBookingStatus(req, res) {
  const { id } = req.validated.params;
  const { status } = req.validated.body;
  const booking = await getBookingById(id);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const isCustomer = booking.customerId === req.auth.userId;
  const isProvider = booking.providerUserId === req.auth.userId;
  const isAdmin = req.auth.role === "admin";

  if (!isCustomer && !isProvider && !isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (isCustomer && !isAdmin && status !== "cancelled") {
    return res.status(403).json({ message: "Customers can only cancel bookings" });
  }

  const updatedBooking = await persistUpdateBookingStatus(id, status);

  const receiverId = isCustomer ? updatedBooking.providerUserId : updatedBooking.customerId;
  if (receiverId) {
    await createNotification({
      id: `notif_${crypto.randomUUID()}`,
      userId: receiverId,
      bookingId: updatedBooking.id,
      title: "Booking status updated",
      message: `Booking ${updatedBooking.id} status changed to ${status}`,
      type: "booking",
      payload: { status },
    });
  }

  if (updatedBooking.customerId) {
    publishToUser(updatedBooking.customerId, "booking.updated", { booking: updatedBooking });
    publishToUser(updatedBooking.customerId, "notification.new", {
      title: "Booking status updated",
      type: "booking",
      bookingId: updatedBooking.id,
      status: updatedBooking.status,
    });
  }
  if (updatedBooking.providerUserId) {
    publishToUser(updatedBooking.providerUserId, "booking.updated", { booking: updatedBooking });
    publishToUser(updatedBooking.providerUserId, "notification.new", {
      title: "Booking status updated",
      type: "booking",
      bookingId: updatedBooking.id,
      status: updatedBooking.status,
    });
  }

  return res.json({ booking: updatedBooking });
}

module.exports = {
  createBooking,
  listMyBookings,
  updateBookingStatus,
  createBookingSchema,
  updateBookingStatusSchema,
  listBookingsSchema,
};
