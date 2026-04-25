const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const hpp = require("hpp");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { env } = require("./config/env");
const { isPostgresReady } = require("./db/postgres");
const apiRoutes = require("./routes");
const { notFound } = require("./middlewares/not-found");
const { errorHandler } = require("./middlewares/error-handler");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(hpp());

app.use(
  cors({
    origin(origin, callback) {
      // During development allow all origins to simplify local previews
      if (!env.isProd) return callback(null, true);
      if (!origin || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy denied this origin"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(env.isProd ? "combined" : "dev"));

app.use("/api/v1", (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }

  if (!isPostgresReady()) {
    return res.status(503).json({
      message: "Database is still starting. Please retry in a moment.",
    });
  }

  return next();
});

const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

// Apply global rate limiter only in production to avoid developer pain.
if (env.isProd) {
  app.use(globalLimiter);
} else {
  // eslint-disable-next-line no-console
  console.log("Skipping global rate limiter in non-production environment");
}
app.use("/api/v1", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
