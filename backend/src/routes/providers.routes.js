const express = require("express");
const { authRequired } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
  listProviders,
  getProviderById,
  listProviderReviews,
  upsertProviderReview,
  createProvider,
  updateProvider,
  listProvidersSchema,
  providerIdSchema,
  listProviderReviewsSchema,
  upsertProviderReviewSchema,
  createProviderSchema,
  updateProviderSchema,
} = require("../controllers/providers.controller");

const router = express.Router();

router.get("/", validate(listProvidersSchema), asyncHandler(listProviders));
router.get("/:id", validate(providerIdSchema), asyncHandler(getProviderById));
router.get("/:id/reviews", validate(listProviderReviewsSchema), asyncHandler(listProviderReviews));
router.post("/:id/reviews", authRequired, validate(upsertProviderReviewSchema), asyncHandler(upsertProviderReview));
router.post("/", authRequired, validate(createProviderSchema), asyncHandler(createProvider));
router.patch("/:id", authRequired, validate(updateProviderSchema), asyncHandler(updateProvider));

module.exports = router;
