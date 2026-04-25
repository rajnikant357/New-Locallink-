const { z } = require("zod");
const { listCategories, listProviders, listAllBookings, listAllMessages, countUsers, countProviders, countCategories, countBookings } = require("../db/repository");

const askSchema = z.object({
  body: z.object({
    question: z.string().trim().min(1).max(2000),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const knowledge = [
  {
    match: [/login|sign.?in|auth/i],
    answer: "Use the Auth page to register or sign in. Auth endpoints: POST /auth/register, POST /auth/login, POST /auth/refresh. Sessions use httpOnly access/refresh cookies.",
  },
  {
    match: [/provider/i, /register/i],
    answer: "Providers register via /register-provider. The backend endpoint is POST /providers with Aadhaar, category, skills, pricing, and social links. Admin verifies applications in the Admin panel.",
  },
  {
    match: [/booking/i],
    answer: "Bookings: customers create at POST /bookings with providerId, service, scheduledFor. Providers/customers can update status at PATCH /bookings/:id/status.",
  },
  {
    match: [/message|chat/i],
    answer: "Messaging is real-time via /messages routes with SSE updates from /realtime/stream. You can list conversations at GET /messages/conversations/me and send at POST /messages.",
  },
  {
    match: [/category/i],
    answer: "Categories are fetched from GET /categories. Admins can create/update/delete categories in the Admin panel and endpoints under /categories.",
  },
  {
    match: [/hurry/i, /urgent/i],
    answer: "Hurry Mode broadcasts urgent requests: POST /hurry, providers accept via POST /hurry/:id/accept; status at GET /hurry/:id.",
  },
];

async function ask(req, res) {
  const { question } = req.validated.body;
  const normalized = question.toLowerCase();

  // Quick rule-based answers
  const hit = knowledge.find((entry) => entry.match.every((regex) => regex.test(normalized)));
  if (hit) {
    return res.json({ answer: hit.answer, sources: ["kb"] });
  }

  // Lightweight dynamic stats to answer generic “what’s available”
  const [categoriesCount, providersCount, bookingsCount, usersCount] = await Promise.all([
    countCategories(),
    countProviders(),
    countBookings(),
    countUsers(),
  ]);

  const fallback = `LocalLink currently has ${categoriesCount} categories, ${providersCount} providers, ${usersCount} users, and ${bookingsCount} bookings recorded. Ask about login, providers, bookings, messaging, categories, or Hurry Mode for specifics.`;
  return res.json({ answer: fallback, sources: ["stats"] });
}

module.exports = {
  askSchema,
  ask,
};
