const crypto = require("crypto");
const { z } = require("zod");
const { toSafeUser } = require("../utils/safe-user");
const { verifyPassword, hashPassword } = require("../utils/password");
const {
  getUserById,
  getUserByEmail,
  updateUser,
} = require("../db/repository");

const notificationSettingsShape = {
  bookingConfirm: z.boolean(),
  messages: z.boolean(),
  reviews: z.boolean(),
  promotions: z.boolean(),
};

const preferencesShape = {
  language: z.enum(["en", "hi"]).default("en"),
  currency: z.string().trim().min(2).max(10).default("INR"),
  darkMode: z.boolean().default(false),
};

const paymentMethodShape = {
  type: z.enum(["upi", "card", "bank"]),
  label: z.string().trim().min(2).max(50),
  value: z.string().trim().min(3).max(120),
};

const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      phone: z.string().trim().min(7).max(20).optional(),
      location: z.string().trim().max(120).optional(),
      email: z.string().trim().toLowerCase().email().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateMyPasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateMyNotificationSettingsSchema = z.object({
  body: z.object(notificationSettingsShape),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateMyPreferencesSchema = z.object({
  body: z.object(preferencesShape),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateMySecuritySchema = z.object({
  body: z.object({
    twoFactorEnabled: z.boolean(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const addPaymentMethodSchema = z.object({
  body: z.object(paymentMethodShape),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const removePaymentMethodSchema = z.object({
  params: z.object({
    paymentMethodId: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

function withDefaults(user) {
  return {
    ...user,
    notificationSettings: {
      bookingConfirm: true,
      messages: true,
      reviews: true,
      promotions: false,
      ...(user.notificationSettings || {}),
    },
    preferences: {
      language: "en",
      currency: "INR",
      darkMode: false,
      ...(user.preferences || {}),
    },
    security: {
      twoFactorEnabled: false,
      ...(user.security || {}),
    },
    paymentMethods: Array.isArray(user.paymentMethods) ? user.paymentMethods : [],
  };
}

async function getMe(req, res) {
  const user = await getUserById(req.auth.userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user: toSafeUser(withDefaults(user)) });
}

async function updateMe(req, res) {
  const updates = req.validated.body;
  const user = await getUserById(req.auth.userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (updates.email && updates.email !== user.email) {
    const exists = await getUserByEmail(updates.email);
    if (exists && exists.id !== user.id) {
      return res.status(409).json({ message: "Email already in use" });
    }
  }

  const updatedUser = await updateUser(user.id, updates);

  return res.json({ user: toSafeUser(withDefaults(updatedUser)) });
}

async function updateMyPassword(req, res) {
  const { currentPassword, newPassword } = req.validated.body;

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must be different from current password" });
  }

  const user = await getUserById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  const nextHash = await hashPassword(newPassword);
  await updateUser(user.id, { passwordHash: nextHash });

  return res.status(204).send();
}

async function updateMyNotificationSettings(req, res) {
  const settings = req.validated.body;
  const user = await getUserById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const nextData = {
    ...(user.data || {}),
    notificationSettings: settings,
  };

  const updatedUser = await updateUser(user.id, { data: nextData });

  return res.json({ notificationSettings: withDefaults(updatedUser).notificationSettings });
}

async function updateMyPreferences(req, res) {
  const preferences = req.validated.body;
  const user = await getUserById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const nextData = {
    ...(user.data || {}),
    preferences,
  };

  const updatedUser = await updateUser(user.id, { data: nextData });

  return res.json({ preferences: withDefaults(updatedUser).preferences });
}

async function updateMySecurity(req, res) {
  const { twoFactorEnabled } = req.validated.body;
  const user = await getUserById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const nextSecurity = {
    ...(user.security || {}),
    twoFactorEnabled,
  };
  const nextData = {
    ...(user.data || {}),
    security: nextSecurity,
  };

  const updatedUser = await updateUser(user.id, { data: nextData });

  return res.json({ security: withDefaults(updatedUser).security });
}

async function listMyPaymentMethods(req, res) {
  const user = await getUserById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ paymentMethods: withDefaults(user).paymentMethods });
}

async function addPaymentMethod(req, res) {
  const payload = req.validated.body;
  const user = await getUserById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const created = {
    id: `pay_${crypto.randomUUID()}`,
    ...payload,
    createdAt: new Date().toISOString(),
  };
  const methods = Array.isArray(user.paymentMethods) ? [...user.paymentMethods] : [];
  methods.push(created);
  const nextData = {
    ...(user.data || {}),
    paymentMethods: methods,
  };

  await updateUser(user.id, { data: nextData });

  return res.status(201).json({ paymentMethod: created });
}

async function removePaymentMethod(req, res) {
  const { paymentMethodId } = req.validated.params;
  const user = await getUserById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const existing = (user.paymentMethods || []).find((item) => item.id === paymentMethodId);
  if (!existing) {
    return res.status(404).json({ message: "Payment method not found" });
  }

  const nextMethods = (user.paymentMethods || []).filter((item) => item.id !== paymentMethodId);
  const nextData = {
    ...(user.data || {}),
    paymentMethods: nextMethods,
  };

  await updateUser(user.id, { data: nextData });

  return res.status(204).send();
}

module.exports = {
  getMe,
  updateMe,
  updateMyPassword,
  updateMyNotificationSettings,
  updateMyPreferences,
  updateMySecurity,
  listMyPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  updateMeSchema,
  updateMyPasswordSchema,
  updateMyNotificationSettingsSchema,
  updateMyPreferencesSchema,
  updateMySecuritySchema,
  addPaymentMethodSchema,
  removePaymentMethodSchema,
};
