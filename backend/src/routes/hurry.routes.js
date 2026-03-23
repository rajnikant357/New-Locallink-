const express = require("express");
const { authRequired } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
  createHurry,
  getStatus,
  cancel,
  accept,
  hurryRequestSchema,
  statusSchema,
  cancelSchema,
  acceptSchema,
} = require("../controllers/hurry.controller");

const router = express.Router();

router.use(authRequired);

router.post("/", validate(hurryRequestSchema), asyncHandler(createHurry));
router.get("/:id", validate(statusSchema), asyncHandler(getStatus));
router.post("/:id/cancel", validate(cancelSchema), asyncHandler(cancel));
router.post("/:id/accept", validate(acceptSchema), asyncHandler(accept));

module.exports = router;
