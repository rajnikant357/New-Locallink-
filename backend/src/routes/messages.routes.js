const express = require("express");
const { authRequired } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
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
} = require("../controllers/messages.controller");

const router = express.Router();

router.use(authRequired);

router.get("/conversations/me", asyncHandler(listConversations));
router.get("/recipients/me", asyncHandler(listRecipients));
router.get("/:withUserId", validate(getConversationSchema), asyncHandler(getConversation));
router.post("/", validate(sendMessageSchema), asyncHandler(sendMessage));
router.patch("/:id", validate(updateMessageSchema), asyncHandler(updateMessage));
router.delete("/:id", validate(messageIdSchema), asyncHandler(deleteMessage));
router.post("/:id/forward", validate(forwardMessageSchema), asyncHandler(forwardMessage));

module.exports = router;
