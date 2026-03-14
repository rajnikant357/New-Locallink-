const express = require("express");
const { authRequired } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
  createBooking,
  listMyBookings,
  updateBookingStatus,
  createBookingSchema,
  updateBookingStatusSchema,
  listBookingsSchema,
} = require("../controllers/bookings.controller");

const router = express.Router();

router.use(authRequired);

router.get("/me", validate(listBookingsSchema), asyncHandler(listMyBookings));
router.post("/", validate(createBookingSchema), asyncHandler(createBooking));
router.patch("/:id/status", validate(updateBookingStatusSchema), asyncHandler(updateBookingStatus));

module.exports = router;
