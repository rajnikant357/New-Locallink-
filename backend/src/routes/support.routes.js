const express = require("express");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const { askSchema, ask } = require("../controllers/support.controller");

const router = express.Router();

router.post("/ask", validate(askSchema), asyncHandler(ask));

module.exports = router;
