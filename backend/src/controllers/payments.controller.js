const crypto = require("crypto");
const { createPayment, getPaymentById, updatePaymentStatus } = require("../db/repository");

// Create a subscription payment record and return a placeholder checkout URL
async function createSubscriptionPayment(req, res) {
  const { plan } = req.body || {};
  const userId = req.auth?.userId || null;

  // map plan to amount (backend authoritative)
  const planAmounts = {
    Free: 0,
    Professional: 49900, // paisa/paise format if needed; we'll return in smallest unit
    Business: 99900,
  };

  const amount = planAmounts[plan] ?? 49900;
  const paymentId = `pay_${crypto.randomUUID()}`;

  const payment = await createPayment({
    id: paymentId,
    type: "subscription",
    relatedId: plan,
    userId,
    amount: amount / 100, // store as units (INR) in DB numeric
    currency: "INR",
    status: "pending",
  });

  // Placeholder checkout URL for future gateway integration
  const checkoutUrl = `/payments/checkout/${paymentId}`;

  return res.status(201).json({ paymentId: payment.id, amount: payment.amount, currency: payment.currency, checkoutUrl });
}

// Create a booking payment (pay-to-provider) record and return placeholder checkout
async function createBookingPayment(req, res) {
  const { bookingId, providerId, amount } = req.body || {};
  const userId = req.auth?.userId || null;
  if (!bookingId || !providerId || !amount) {
    return res.status(400).json({ message: "bookingId, providerId, and amount are required" });
  }

  const paymentId = `pay_${crypto.randomUUID()}`;
  const payment = await createPayment({
    id: paymentId,
    type: "booking",
    relatedId: bookingId,
    userId,
    providerId,
    amount,
    currency: "INR",
    status: "pending",
  });

  const checkoutUrl = `/payments/checkout/${paymentId}`;
  return res.status(201).json({ paymentId: payment.id, amount: payment.amount, currency: payment.currency, checkoutUrl });
}

// Simple endpoint to mark payment complete (would be called by gateway webhook)
async function completePayment(req, res) {
  const { id } = req.params;
  const payment = await getPaymentById(id);
  if (!payment) return res.status(404).json({ message: "Payment not found" });
  const updated = await updatePaymentStatus(id, "completed", req.body.gatewaySession || null);
  return res.json({ payment: updated });
}

module.exports = {
  createSubscriptionPayment,
  createBookingPayment,
  completePayment,
};
