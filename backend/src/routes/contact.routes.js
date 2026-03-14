const express = require("express");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
  createContactMessage,
  createContactMessageSchema,
} = require("../controllers/contact.controller");

const router = express.Router();

router.post("/", validate(createContactMessageSchema), asyncHandler(createContactMessage));

module.exports = router;
