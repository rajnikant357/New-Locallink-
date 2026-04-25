const crypto = require("crypto");
const { z } = require("zod");
const { toSafeUser } = require("../utils/safe-user");
const { hashPassword } = require("../utils/password");
const { userTypeSchema } = require("../schemas/account.schemas");
const { assertRoleChangeAllowed } = require("../utils/role-conflicts");
const {
  countCategories,
  countUsers,
  countProviders,
  countBookings,
  countUnreadNotifications,
  listUsers,
  listProviders: fetchProviders,
  listAllBookings,
  listAllMessages,
  getUsersByIds,
  getUserById,
  getUserByEmail,
  getProviderByUserId,
  deleteUser,
  deleteProvider,
  updateUser,
  getProviderById,
  updateProvider: persistProviderUpdate,
  createMessage: persistMessage,
  getMessageById,
  updateMessageText,
  deleteMessage: removeMessage,
  createNotification,
  getCategoryByName,
  listContactMessages,
  updateContactMessage,
  getContactMessageById,
  deleteContactMessage,
} = require("../db/repository");

const adminUserIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const adminProviderIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const adminMessageIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const adminEditChatMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    text: z.string().trim().min(1).max(2000),
  }),
  query: z.object({}).optional(),
});

const adminForwardMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    toUserId: z.string().min(1),
  }),
  query: z.object({}).optional(),
});

const adminEditContactMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    subject: z.string().trim().min(2).max(120),
    message: z.string().trim().min(5).max(4000),
  }),
  query: z.object({}).optional(),
});

const adminUpdateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      phone: z.string().trim().min(7).max(20).optional(),
      location: z.string().trim().max(120).optional(),
      email: z.string().trim().toLowerCase().email().optional(),
      password: z.string().min(8).max(128).optional(),
      // align with self-service update limit (~10MB data URL/string)
      profileImageUrl: z.string().trim().max(10_000_000).optional(),
      type: userTypeSchema.optional(),
      isActive: z.boolean().optional(),
      notificationSettings: z
        .object({
          bookingConfirm: z.boolean(),
          messages: z.boolean(),
          reviews: z.boolean(),
          promotions: z.boolean(),
        })
        .optional(),
      preferences: z
        .object({
          language: z.enum(["en", "hi"]).default("en"),
          currency: z.string().trim().min(2).max(10).default("INR"),
          darkMode: z.boolean().default(false),
        })
        .optional(),
      security: z
        .object({
          twoFactorEnabled: z.boolean(),
        })
        .optional(),
      paymentMethods: z
        .array(
          z.object({
            id: z.string().min(1),
            type: z.enum(["upi", "card", "bank"]),
            label: z.string().trim().min(2).max(50),
            value: z.string().trim().min(3).max(120),
            createdAt: z.string().min(1).optional(),
          }),
        )
        .max(20)
        .optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  query: z.object({}).optional(),
});

const adminUpdateProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      category: z.string().trim().min(2).max(80).optional(),
      bio: z.string().trim().min(10).max(1200).optional(),
      location: z.string().trim().min(2).max(120).optional(),
      billingType: z.enum(["hourly", "day"]).optional(),
      priceMin: z.number().nonnegative().optional(),
      experience: z.enum(["<1", "1-3", "3-5", "5+"]).optional(),
      hourlyRate: z.number().nonnegative().optional(),
      skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      aadhaarNumber: z.string().trim().regex(/^\d{12}$/, "Aadhaar number must be 12 digits").optional(),
      certificateUrl: z.string().trim().max(900000).optional(),
      socialLinks: z
        .object({
          website: z.string().trim().max(500).optional(),
          instagram: z.string().trim().max(500).optional(),
          facebook: z.string().trim().max(500).optional(),
          linkedin: z.string().trim().max(500).optional(),
        })
        .optional(),
      applicationStatus: z.enum(["pending", "approved", "rejected"]).optional(),
      verificationNotes: z.string().trim().max(1200).optional(),
      isVerified: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  query: z.object({}).optional(),
});

function mergeUserDataPatch(currentUser, updates) {
  const dataPatch = {};
  const dataKeys = ["notificationSettings", "preferences", "security", "paymentMethods"];

  dataKeys.forEach((key) => {
    if (updates[key] !== undefined) {
      dataPatch[key] = updates[key];
      delete updates[key];
    }
  });

  if (Object.keys(dataPatch).length === 0) {
    return null;
  }

  return {
    ...(currentUser.data || {}),
    ...dataPatch,
  };
}

async function adminOverview(req, res) {
  const [categoriesCount, usersCount, providersCount, bookingsCount, unreadNotificationsCount] = await Promise.all([
    countCategories(),
    countUsers(),
    countProviders(),
    countBookings(),
    countUnreadNotifications(),
  ]);

  return res.json({
    overview: {
      categoriesCount,
      usersCount,
      providersCount,
      bookingsCount,
      unreadNotificationsCount,
    },
  });
}

async function adminUsers(req, res) {
  const users = await listUsers();
  return res.json({ users: users.map((user) => toSafeUser(user)) });
}

async function adminProviders(req, res) {
  const providers = await fetchProviders();
  const owners = await getUsersByIds(providers.map((provider) => provider.userId).filter(Boolean));
  const ownersById = new Map(owners.map((user) => [user.id, user]));

  const enriched = providers.map((provider) => {
    const owner = provider.userId ? ownersById.get(provider.userId) : null;
    return {
      ...provider,
      user: owner
        ? {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            phone: owner.phone || "",
            location: owner.location || "",
            profileImageUrl: owner.profileImageUrl || "",
            type: owner.type || "customer",
          }
        : null,
    };
  });

  return res.json({ providers: enriched });
}

async function adminBookings(req, res) {
  const bookings = await listAllBookings();
  return res.json({ bookings });
}

async function adminMessages(req, res) {
  const [messages, contactMessages] = await Promise.all([listAllMessages(), listContactMessages()]);
  const userIds = Array.from(
    new Set(messages.flatMap((message) => [message.fromUserId, message.toUserId]).filter(Boolean)),
  );
  const users = await getUsersByIds(userIds);
  const usersById = new Map(users.map((user) => [user.id, user]));

  const enriched = messages.map((message) => ({
    ...message,
    fromUser: usersById.get(message.fromUserId)?.name || null,
    toUser: usersById.get(message.toUserId)?.name || null,
  }));

  return res.json({ messages: enriched, contactMessages });
}

async function adminUpdateUser(req, res) {
  const { id } = req.validated.params;
  const updates = { ...req.validated.body };

  const existingUser = await getUserById(id);
  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (updates.type && updates.type !== existingUser.type) {
    const ownsProviderProfile = Boolean(await getProviderByUserId(id));
    assertRoleChangeAllowed(existingUser, updates.type, ownsProviderProfile);
  }

  if (updates.email && updates.email !== existingUser.email) {
    const emailTakenBy = await getUserByEmail(updates.email);
    if (emailTakenBy && emailTakenBy.id !== id) {
      return res.status(409).json({ message: "Email already in use" });
    }
  }

  if (updates.password) {
    updates.passwordHash = await hashPassword(updates.password);
    delete updates.password;
  }

  const mergedData = mergeUserDataPatch(existingUser, updates);
  if (mergedData) {
    updates.data = mergedData;
  }

  const user = await updateUser(id, updates);
  return res.json({ user: toSafeUser(user) });
}

async function adminUpdateProvider(req, res) {
  const { id } = req.validated.params;
  const updates = { ...req.validated.body };

  const existingProvider = await getProviderById(id);
  if (!existingProvider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  if (updates.category) {
    const categoryExists = await getCategoryByName(updates.category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Category does not exist" });
    }
  }


  if (updates.applicationStatus) {
    updates.isVerified = updates.applicationStatus === "approved";
  } else if (updates.isVerified !== undefined) {
    updates.applicationStatus = updates.isVerified ? "approved" : "pending";
  }

  const provider = await persistProviderUpdate(id, updates);
  return res.json({ provider });
}

async function adminDeleteUser(req, res) {
  const { id } = req.validated.params;

  const existingUser = await getUserById(id);
  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  await deleteUser(id);
  return res.status(204).send();
}

async function adminDeleteProvider(req, res) {
  const { id } = req.validated.params;

  const existingProvider = await getProviderById(id);
  if (!existingProvider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  await deleteProvider(id);
  return res.status(204).send();
}

async function adminEditChatMessage(req, res) {
  const { id } = req.validated.params;
  const { text } = req.validated.body;

  const existing = await getMessageById(id);
  if (!existing) {
    return res.status(404).json({ message: "Message not found" });
  }

  const message = await updateMessageText(id, text);
  return res.json({ message });
}

async function adminDeleteChatMessage(req, res) {
  const { id } = req.validated.params;

  const existing = await getMessageById(id);
  if (!existing) {
    return res.status(404).json({ message: "Message not found" });
  }

  await removeMessage(id);
  return res.status(204).send();
}

async function adminForwardChatMessage(req, res) {
  const { id } = req.validated.params;
  const { toUserId } = req.validated.body;

  const source = await getMessageById(id);
  if (!source) {
    return res.status(404).json({ message: "Message not found" });
  }

  const recipient = await getUserById(toUserId);
  if (!recipient) {
    return res.status(404).json({ message: "Recipient not found" });
  }

  const forwarded = await persistMessage({
    id: `msg_${crypto.randomUUID()}`,
    fromUserId: req.auth.userId,
    toUserId,
    text: `Forwarded message: ${source.text}`,
    forwardedFromMessageId: source.id,
  });

  await createNotification({
    id: `notif_${crypto.randomUUID()}`,
    userId: toUserId,
    fromUserId: req.auth.userId,
    messageId: forwarded.id,
    title: "New message",
    message: forwarded.text.length > 80 ? `${forwarded.text.slice(0, 80)}...` : forwarded.text,
    type: "message",
  });

  return res.status(201).json({ message: forwarded });
}

async function adminEditContactMessage(req, res) {
  const { id } = req.validated.params;
  const { subject, message } = req.validated.body;

  const existing = await getContactMessageById(id);
  if (!existing) {
    return res.status(404).json({ message: "Contact message not found" });
  }

  const updated = await updateContactMessage(id, { subject, message });
  return res.json({ contactMessage: updated });
}

async function adminDeleteContactMessage(req, res) {
  const { id } = req.validated.params;

  const existing = await getContactMessageById(id);
  if (!existing) {
    return res.status(404).json({ message: "Contact message not found" });
  }

  await deleteContactMessage(id);
  return res.status(204).send();
}

module.exports = {
  adminOverview,
  adminUsers,
  adminProviders,
  adminBookings,
  adminMessages,
  adminUpdateUser,
  adminUpdateProvider,
  adminDeleteUser,
  adminDeleteProvider,
  adminEditChatMessage,
  adminDeleteChatMessage,
  adminForwardChatMessage,
  adminEditContactMessage,
  adminDeleteContactMessage,
  adminUserIdSchema,
  adminProviderIdSchema,
  adminMessageIdSchema,
  adminUpdateUserSchema,
  adminUpdateProviderSchema,
  adminEditChatMessageSchema,
  adminForwardMessageSchema,
  adminEditContactMessageSchema,
};


