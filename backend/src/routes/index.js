const express = require("express");

const authRoutes = require("./auth.routes");
const categoriesRoutes = require("./categories.routes");
const providerRoutes = require("./providers.routes");
const bookingRoutes = require("./bookings.routes");
const messageRoutes = require("./messages.routes");
const notificationRoutes = require("./notifications.routes");
const usersRoutes = require("./users.routes");
const adminRoutes = require("./admin.routes");
const realtimeRoutes = require("./realtime.routes");
const contactRoutes = require("./contact.routes");
const hurryRoutes = require("./hurry.routes");
const supportRoutes = require("./support.routes");
const { publicStats } = require("../controllers/public.controller");
const paymentsController = require("../controllers/payments.controller");
const { isPostgresReady, getPostgresBootstrapError } = require("../db/postgres");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: isPostgresReady() ? "ok" : "starting",
    databaseReady: isPostgresReady(),
    databaseError: getPostgresBootstrapError(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/stats", publicStats);
router.post("/payments/subscription", paymentsController.createSubscriptionPayment);
router.post("/payments/booking", paymentsController.createBookingPayment);
router.post("/payments/:id/complete", paymentsController.completePayment);

router.use("/auth", authRoutes);
router.use("/categories", categoriesRoutes);
router.use("/providers", providerRoutes);
router.use("/bookings", bookingRoutes);
router.use("/messages", messageRoutes);
router.use("/notifications", notificationRoutes);
router.use("/users", usersRoutes);
router.use("/admin", adminRoutes);
router.use("/realtime", realtimeRoutes);
router.use("/contact", contactRoutes);
router.use("/hurry", hurryRoutes);
router.use("/support", supportRoutes);

module.exports = router;
