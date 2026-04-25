const dotenv = require("dotenv");
const { URL } = require("url");

dotenv.config();

function required(name, fallback = "") {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseBoolean(value, name) {
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean value for ${name}: ${value}`);
}

function parseDatabaseUrl(raw) {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    throw new Error(
      "Invalid DATABASE_URL. If your password has special characters (for example @), URL-encode them.",
    );
  }
}

function resolvePgSslMode(raw) {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  const validModes = new Set(["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]);
  if (!validModes.has(normalized)) {
    throw new Error(`Invalid PGSSLMODE value: ${raw}`);
  }
  return normalized;
}

function isNeonPoolerHost(hostname) {
  return /(^|\.)pooler\./i.test(hostname) || /-pooler\./i.test(hostname);
}

function resolvePgSslConfig(pgSslMode, { hostName, explicitRejectUnauthorized } = {}) {
  if (!pgSslMode || pgSslMode === "disable") {
    return false;
  }

  if (hostName && isNeonPoolerHost(hostName)) {
    return {
      rejectUnauthorized: false,
    };
  }

  if (explicitRejectUnauthorized !== undefined && explicitRejectUnauthorized !== "") {
    return {
      rejectUnauthorized: parseBoolean(explicitRejectUnauthorized, "PGSSL_REJECT_UNAUTHORIZED"),
    };
  }

  return {
    rejectUnauthorized: pgSslMode === "verify-ca" || pgSslMode === "verify-full",
  };
}

function assertSecretStrength(name, value) {
  if ((value || "").length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }
}

const databaseUrl = (process.env.DATABASE_URL || "").trim();
const parsedDbUrl = parseDatabaseUrl(databaseUrl);
const pgSslMode = resolvePgSslMode(
  process.env.PGSSLMODE ||
    process.env.pgsslmode ||
    parsedDbUrl?.searchParams?.get("sslmode") ||
    parsedDbUrl?.searchParams?.get("pgsslmode") ||
    "",
);

const normalizedPgSslMode = (() => {
  if (!pgSslMode || !parsedDbUrl) return pgSslMode;
  if (pgSslMode === "verify-full" && isNeonPoolerHost(parsedDbUrl.hostname)) {
    return "require";
  }
  return pgSslMode;
})();

function buildPgConnectionString(rawUrl) {
  if (!rawUrl) return undefined;

  const url = parseDatabaseUrl(rawUrl);
  if (!url) return undefined;

  url.searchParams.delete("sslmode");
  url.searchParams.delete("pgsslmode");
  url.searchParams.delete("channel_binding");

  return url.toString();
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  accessTokenSecret: required("ACCESS_TOKEN_SECRET", "dev_access_secret_change_me_12345678901234567890"),
  // Refresh token secret is optional when using server-backed opaque sessions.
  // Keep an empty string when not provided to preserve backward compatibility.
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "",
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:8080,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  adminBootstrapKey: process.env.ADMIN_BOOTSTRAP_KEY || "",
  pgConnectionString: parsedDbUrl ? buildPgConnectionString(databaseUrl) : undefined,
  pgHost: parsedDbUrl?.hostname || process.env.PGHOST || "localhost",
  pgPort: Number(parsedDbUrl?.port || process.env.PGPORT || 5432),
  pgDatabase: (parsedDbUrl?.pathname || process.env.PGDATABASE || "locallink").replace(/^\//, ""),
  pgUser: parsedDbUrl?.username || process.env.PGUSER || "",
  pgPassword: parsedDbUrl?.password || process.env.PGPASSWORD || "",
  pgSslMode: normalizedPgSslMode,
  pgSsl: resolvePgSslConfig(normalizedPgSslMode, {
    hostName: parsedDbUrl?.hostname || process.env.PGHOST || "",
    explicitRejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED,
  }),
};

env.isProd = env.nodeEnv === "production";

assertSecretStrength("ACCESS_TOKEN_SECRET", env.accessTokenSecret);

if (env.refreshTokenSecret) {
  assertSecretStrength("REFRESH_TOKEN_SECRET", env.refreshTokenSecret);
}

if (env.refreshTokenSecret && env.accessTokenSecret === env.refreshTokenSecret) {
  throw new Error("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different");
}

if (
  env.isProd &&
  (env.accessTokenSecret.includes("change_me") || env.accessTokenSecret.startsWith("dev_") ||
    (env.refreshTokenSecret && (env.refreshTokenSecret.includes("change_me") || env.refreshTokenSecret.startsWith("dev_"))))
) {
  throw new Error("Refusing to start in production with placeholder token secrets");
}

module.exports = { env };
