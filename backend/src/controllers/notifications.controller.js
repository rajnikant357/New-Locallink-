const { z } = require("zod");
const { publishToUser } = require("../realtime/hub");
const {
  listNotifications: fetchNotifications,
  markNotificationRead: markNotificationAsRead,
  markAllNotificationsRead: markAllNotificationsAsRead,
  markMessageNotificationsReadBySender: markMessageNotificationsBySender,
  markAllMessageNotificationsRead: markAllMessageNotificationsAsRead,
} = require("../db/repository");

const listNotificationsSchema = z.object({
  query: z.object({
    unreadOnly: z
      .string()
      .optional()
      .transform((value) => value === "true"),
    includeMessage: z
      .string()
      .optional()
      .transform((value) => value === "true"),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

const notificationIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const fromUserIdSchema = z.object({
  params: z.object({
    fromUserId: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

async function listMyNotifications(req, res) {
  const { unreadOnly, includeMessage } = req.validated.query;
  const notifications = await fetchNotifications(req.auth.userId, { unreadOnly, includeMessage });
  return res.json({ notifications });
}

async function markNotificationRead(req, res) {
  const { id } = req.validated.params;

  const notification = await markNotificationAsRead(id, req.auth.userId);
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  publishToUser(req.auth.userId, "notification.updated", { notification });

  return res.json({ notification });
}

async function markAllNotificationsRead(req, res) {
  const updated = await markAllNotificationsAsRead(req.auth.userId);

  updated.forEach((notification) => {
    publishToUser(req.auth.userId, "notification.updated", { notification });
  });

  publishToUser(req.auth.userId, "notification.bulkUpdated", { userId: req.auth.userId });

  return res.status(204).send();
}

async function markMessageNotificationsReadBySender(req, res) {
  const { fromUserId } = req.validated.params;

  const updated = await markMessageNotificationsBySender(req.auth.userId, fromUserId);
  updated.forEach((notification) => {
    publishToUser(req.auth.userId, "notification.updated", { notification });
  });

  return res.status(204).send();
}

async function markAllMessageNotificationsRead(req, res) {
  const updated = await markAllMessageNotificationsAsRead(req.auth.userId);
  updated.forEach((notification) => {
    publishToUser(req.auth.userId, "notification.updated", { notification });
  });

  return res.status(204).send();
}

module.exports = {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markMessageNotificationsReadBySender,
  markAllMessageNotificationsRead,
  listNotificationsSchema,
  notificationIdSchema,
  fromUserIdSchema,
};
