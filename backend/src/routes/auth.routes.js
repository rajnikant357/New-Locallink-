const express = require("express");
const rateLimit = require("express-rate-limit");
const { authRequired } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const { env } = require("../config/env");
const {
  register,
  login,
  me,
  refresh,
  logout,
  registerSchema,
  loginSchema,
} = require("../controllers/auth.controller");

const router = express.Router();
const authAttemptLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "unknown";
    return `${req.ip}:${email}`;
  },
  skipSuccessfulRequests: true,
  message: { message: "Too many auth attempts. Please try again later." },
});

router.post("/register", authAttemptLimiter, validate(registerSchema), asyncHandler(register));
router.post("/login", authAttemptLimiter, validate(loginSchema), asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));
router.get("/me", authRequired, asyncHandler(me));

module.exports = router;
