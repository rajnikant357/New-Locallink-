const express = require("express");
const { authRequired } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
  getMe,
  updateMe,
  updateMyPassword,
  updateMyNotificationSettings,
  updateMyPreferences,
  updateMySecurity,
  listMyPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  updateMeSchema,
  updateMyPasswordSchema,
  updateMyNotificationSettingsSchema,
  updateMyPreferencesSchema,
  updateMySecuritySchema,
  addPaymentMethodSchema,
  removePaymentMethodSchema,
} = require("../controllers/users.controller");

const router = express.Router();

router.use(authRequired);

router.get("/me", asyncHandler(getMe));
router.patch("/me", validate(updateMeSchema), asyncHandler(updateMe));
router.patch("/me/password", validate(updateMyPasswordSchema), asyncHandler(updateMyPassword));
router.patch(
  "/me/notifications",
  validate(updateMyNotificationSettingsSchema),
  asyncHandler(updateMyNotificationSettings),
);
router.patch("/me/preferences", validate(updateMyPreferencesSchema), asyncHandler(updateMyPreferences));
router.patch("/me/security", validate(updateMySecuritySchema), asyncHandler(updateMySecurity));
router.get("/me/payment-methods", asyncHandler(listMyPaymentMethods));
router.post("/me/payment-methods", validate(addPaymentMethodSchema), asyncHandler(addPaymentMethod));
router.delete(
  "/me/payment-methods/:paymentMethodId",
  validate(removePaymentMethodSchema),
  asyncHandler(removePaymentMethod),
);

module.exports = router;
