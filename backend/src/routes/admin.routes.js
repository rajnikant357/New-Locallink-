const express = require("express");
const { authRequired, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
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
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(authRequired, requireRole("admin"));

router.get("/overview", asyncHandler(adminOverview));
router.get("/users", asyncHandler(adminUsers));
router.get("/providers", asyncHandler(adminProviders));
router.get("/bookings", asyncHandler(adminBookings));
router.get("/messages", asyncHandler(adminMessages));

router.patch("/users/:id", validate(adminUpdateUserSchema), asyncHandler(adminUpdateUser));
router.delete("/users/:id", validate(adminUserIdSchema), asyncHandler(adminDeleteUser));

router.patch("/providers/:id", validate(adminUpdateProviderSchema), asyncHandler(adminUpdateProvider));
router.delete("/providers/:id", validate(adminProviderIdSchema), asyncHandler(adminDeleteProvider));

router.patch("/messages/chat/:id", validate(adminEditChatMessageSchema), asyncHandler(adminEditChatMessage));
router.delete("/messages/chat/:id", validate(adminMessageIdSchema), asyncHandler(adminDeleteChatMessage));
router.post("/messages/chat/:id/forward", validate(adminForwardMessageSchema), asyncHandler(adminForwardChatMessage));
router.patch("/messages/contact/:id", validate(adminEditContactMessageSchema), asyncHandler(adminEditContactMessage));
router.delete("/messages/contact/:id", validate(adminMessageIdSchema), asyncHandler(adminDeleteContactMessage));

module.exports = router;
