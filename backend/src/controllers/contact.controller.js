const crypto = require("crypto");
const { z } = require("zod");
const { createContactMessage: persistContactMessage } = require("../db/repository");

const createContactMessageSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    phone: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.union([z.literal(""), z.string().min(7).max(20)]).optional().default(""),
    ),
    subject: z.string().trim().min(2).max(120),
    message: z.string().trim().min(5).max(4000),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

async function createContactMessage(req, res) {
  const payload = req.validated.body;
  const created = await persistContactMessage({
    id: `contact_${crypto.randomUUID()}`,
    ...payload,
  });

  return res.status(201).json({ contactMessage: created });
}

module.exports = {
  createContactMessage,
  createContactMessageSchema,
};
