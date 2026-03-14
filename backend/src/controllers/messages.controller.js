const crypto = require("crypto");
const { z } = require("zod");
const { publishToUser } = require("../realtime/hub");
const { toSafeUser } = require("../utils/safe-user");
const {
  listConversation,
  createMessage: persistMessage,
  listMessagesForUser,
  getMessageById,
  updateMessageText,
  deleteMessage: removeMessage,
  getUserById,
  getUsersByIds,
  listRecipients: fetchRecipients,
  createNotification,
} = require("../db/repository");

const sendMessageSchema = z.object({
  body: z.object({
    toUserId: z.string().min(1),
    text: z.string().trim().min(1).max(2000),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const getConversationSchema = z.object({
  params: z.object({
    withUserId: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const messageIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    text: z.string().trim().min(1).max(2000),
  }),
  query: z.object({}).optional(),
});

const forwardMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    toUserId: z.string().min(1),
  }),
  query: z.object({}).optional(),
});

async function sendMessage(req, res) {
  const { toUserId, text } = req.validated.body;

  if (toUserId === req.auth.userId) {
    return res.status(400).json({ message: "Cannot send message to yourself" });
  }

  const recipient = await getUserById(toUserId);
  if (!recipient) {
    return res.status(404).json({ message: "Recipient not found" });
  }

  const message = await persistMessage({
    id: `msg_${crypto.randomUUID()}`,
    fromUserId: req.auth.userId,
    toUserId,
    text,
  });

  const notification = await createNotification({
    id: `notif_${crypto.randomUUID()}`,
    userId: toUserId,
    fromUserId: req.auth.userId,
    messageId: message.id,
    title: "New message",
    message: text.length > 80 ? `${text.slice(0, 80)}...` : text,
    type: "message",
  });

  publishToUser(toUserId, "message.new", { message });
  publishToUser(toUserId, "notification.new", {
    notification,
    type: "message",
    title: "New message",
  });
  publishToUser(req.auth.userId, "message.new", { message });

  return res.status(201).json({ message });
}

async function getConversation(req, res) {
  const { withUserId } = req.validated.params;
  const me = req.auth.userId;
  const messages = await listConversation(me, withUserId);
  return res.json({ messages });
}

async function listConversations(req, res) {
  const me = req.auth.userId;
  const related = await listMessagesForUser(me);
  const otherUserIds = Array.from(
    new Set(
      related
        .map((message) => (message.fromUserId === me ? message.toUserId : message.fromUserId))
        .filter(Boolean),
    ),
  );

  const users = await getUsersByIds(otherUserIds);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const conversationMap = new Map();

  for (const message of related) {
    const otherUserId = message.fromUserId === me ? message.toUserId : message.fromUserId;
    const existing = conversationMap.get(otherUserId);

    if (!existing || new Date(message.createdAt) > new Date(existing.lastMessage.createdAt)) {
      const otherUser = usersById.get(otherUserId);
      conversationMap.set(otherUserId, {
        user: otherUser ? { id: otherUser.id, name: otherUser.name, email: otherUser.email, type: otherUser.type } : null,
        lastMessage: message,
      });
    }
  }

  return res.json({ conversations: Array.from(conversationMap.values()) });
}

async function listRecipients(req, res) {
  const recipients = await fetchRecipients(req.auth.userId);
  return res.json({ recipients: recipients.map((user) => toSafeUser(user)) });
}

async function updateMessage(req, res) {
  const { id } = req.validated.params;
  const { text } = req.validated.body;

  const existing = await getMessageById(id);
  if (!existing) {
    return res.status(404).json({ message: "Message not found" });
  }

  const isOwner = existing.fromUserId === req.auth.userId;
  const isAdmin = req.auth.role === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const message = await updateMessageText(id, text);

  if (message.toUserId) {
    publishToUser(message.toUserId, "message.updated", { message });
  }
  if (message.fromUserId) {
    publishToUser(message.fromUserId, "message.updated", { message });
  }

  return res.json({ message });
}

async function deleteMessage(req, res) {
  const { id } = req.validated.params;

  const existing = await getMessageById(id);
  if (!existing) {
    return res.status(404).json({ message: "Message not found" });
  }

  const isOwner = existing.fromUserId === req.auth.userId;
  const isAdmin = req.auth.role === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  await removeMessage(id);

  if (existing?.toUserId) {
    publishToUser(existing.toUserId, "message.deleted", { id: existing.id });
  }
  if (existing?.fromUserId) {
    publishToUser(existing.fromUserId, "message.deleted", { id: existing.id });
  }

  return res.status(204).send();
}

async function forwardMessage(req, res) {
  const { id } = req.validated.params;
  const { toUserId } = req.validated.body;

  if (toUserId === req.auth.userId) {
    return res.status(400).json({ message: "Cannot forward message to yourself" });
  }

  const source = await getMessageById(id);
  if (!source) {
    return res.status(404).json({ message: "Message not found" });
  }

  const isParticipant = source.fromUserId === req.auth.userId || source.toUserId === req.auth.userId;
  const isAdmin = req.auth.role === "admin";
  if (!isParticipant && !isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const recipient = await getUserById(toUserId);
  if (!recipient) {
    return res.status(404).json({ message: "Recipient not found" });
  }

  const message = await persistMessage({
    id: `msg_${crypto.randomUUID()}`,
    fromUserId: req.auth.userId,
    toUserId,
    text: `Forwarded: ${source.text}`,
    forwardedFromMessageId: source.id,
  });

  const notification = await createNotification({
    id: `notif_${crypto.randomUUID()}`,
    userId: toUserId,
    fromUserId: req.auth.userId,
    messageId: message.id,
    title: "New message",
    message: message.text.length > 80 ? `${message.text.slice(0, 80)}...` : message.text,
    type: "message",
  });

  publishToUser(toUserId, "message.new", { message });
  publishToUser(toUserId, "notification.new", {
    notification,
    type: "message",
    title: "New message",
  });
  publishToUser(req.auth.userId, "message.new", { message });

  return res.status(201).json({ message });
}

module.exports = {
  sendMessage,
  getConversation,
  listConversations,
  listRecipients,
  updateMessage,
  deleteMessage,
  forwardMessage,
  sendMessageSchema,
  getConversationSchema,
  messageIdSchema,
  updateMessageSchema,
  forwardMessageSchema,
};
