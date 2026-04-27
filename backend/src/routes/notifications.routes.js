const express = require("express");
const { authRequired } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markMessageNotificationsReadBySender,
  markAllMessageNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  listNotificationsSchema,
  notificationIdSchema,
  fromUserIdSchema,
} = require("../controllers/notifications.controller");

const router = express.Router();

router.use(authRequired);

router.get("/me", validate(listNotificationsSchema), asyncHandler(listMyNotifications));
router.patch("/messages/read-all", asyncHandler(markAllMessageNotificationsRead));
router.patch("/messages/:fromUserId/read", validate(fromUserIdSchema), asyncHandler(markMessageNotificationsReadBySender));
router.patch("/:id/read", validate(notificationIdSchema), asyncHandler(markNotificationRead));
router.patch("/read-all", asyncHandler(markAllNotificationsRead));
router.delete("/:id", validate(notificationIdSchema), asyncHandler(deleteNotification));
router.delete("/", asyncHandler(deleteAllNotifications));

module.exports = router;
