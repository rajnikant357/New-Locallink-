const { z } = require("zod");

const USER_TYPES = ["customer", "provider", "admin"];
const userTypeSchema = z.enum(USER_TYPES);

const baseRegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20).optional().default(""),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

const customerRegisterBodySchema = baseRegisterSchema.extend({
  type: z.literal("customer"),
});

const providerRegisterBodySchema = baseRegisterSchema.extend({
  type: z.literal("provider"),
});

const adminRegisterBodySchema = baseRegisterSchema.extend({
  type: z.literal("admin"),
});

const registerBodySchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === "object" && !Array.isArray(raw) && !("type" in raw)) {
      return { ...raw, type: "customer" };
    }
    return raw;
  },
  z.discriminatedUnion("type", [
    customerRegisterBodySchema,
    providerRegisterBodySchema,
    adminRegisterBodySchema,
  ]),
);

module.exports = {
  USER_TYPES,
  userTypeSchema,
  registerBodySchema,
  customerRegisterBodySchema,
  providerRegisterBodySchema,
  adminRegisterBodySchema,
};
