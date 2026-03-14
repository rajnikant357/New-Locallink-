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

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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

module.exports = router;
