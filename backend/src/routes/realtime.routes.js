const express = require("express");
const { verifyAccessToken } = require("../utils/tokens");
const { getUserById } = require("../db/repository");
const { addClient, removeClient, writeEvent } = require("../realtime/hub");

const router = express.Router();

router.get("/stream", async (req, res) => {
  const token = req.query.token || req.cookies?.ll_access;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    addClient(user.id, res);
    writeEvent(res, "connected", { userId: user.id, timestamp: new Date().toISOString() });

    const keepAlive = setInterval(() => {
      writeEvent(res, "ping", { timestamp: new Date().toISOString() });
    }, 25000);

    req.on("close", () => {
      clearInterval(keepAlive);
      removeClient(user.id, res);
    });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
