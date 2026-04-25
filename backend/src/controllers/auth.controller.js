const crypto = require("crypto");
const { z } = require("zod");
const { hashPassword, verifyPassword } = require("../utils/password");
const { toSafeUser } = require("../utils/safe-user");
const { signAccessToken, hashToken } = require("../utils/tokens");
const { env } = require("../config/env");
const { registerBodySchema } = require("../schemas/account.schemas");
const {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getUserByResetTokenHash,
  setResetTokenForUser,
  clearResetTokenForUser,
  createSession,
  getSessionByHash,
  rotateSession,
  revokeSessionByHash,
} = require("../db/repository");

const registerSchema = z.object({
  body: registerBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(128),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    password: z.string().min(8).max(128),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const socialLoginSchema = z.object({
  body: z.object({
    provider: z.enum(["google", "facebook"]),
    email: z.string().trim().toLowerCase().email(),
    name: z.string().trim().min(1).max(200),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function setRefreshCookie(res, token) {
  res.cookie("ll_refresh", token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("ll_refresh", {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    path: "/",
  });
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAccessCookie(res, token) {
  res.cookie("ll_access", token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    path: "/",
    maxAge: 15 * 60 * 1000,
  });
}

function clearAccessCookie(res) {
  res.clearCookie("ll_access", {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    path: "/",
  });
}

async function register(req, res) {
  const { name, phone, email, password, type } = req.validated.body;

  if (type === "admin") {
    const bootstrapKey = req.headers["x-admin-bootstrap-key"];
    if (!env.adminBootstrapKey || bootstrapKey !== env.adminBootstrapKey) {
      return res.status(403).json({ message: "Admin registration is not allowed" });
    }
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);
  const userId = createId("user");
  const createdUser = await createUser({
    id: userId,
    name,
    phone,
    email,
    type,
    passwordHash,
    refreshTokenHashes: [],
    data: {},
  });

  const accessToken = signAccessToken(createdUser);

  // create server-backed session (opaque refresh token)
  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const refreshHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await createSession({ userId: createdUser.id, tokenHash: refreshHash, userAgent: req.get("user-agent"), ipAddress: req.ip, expiresAt });

  // set cookies
  setRefreshCookie(res, rawRefreshToken);
  setAccessCookie(res, accessToken);

  const updatedUser = await getUserById(createdUser.id);

  return res.status(201).json({ user: toSafeUser(updatedUser), accessToken });
}

async function login(req, res) {
  const { email, password } = req.validated.body;
  const user = await getUserByEmail(email);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = signAccessToken(user);

  // create server-backed session
  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const refreshHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await createSession({ userId: user.id, tokenHash: refreshHash, userAgent: req.get("user-agent"), ipAddress: req.ip, expiresAt });

  setRefreshCookie(res, rawRefreshToken);
  setAccessCookie(res, accessToken);

  const updatedUser = await getUserById(user.id);

  // debug: log that we set cookies (truncated hash) to help diagnose client cookie issues
  try {
    // eslint-disable-next-line no-console
    console.info(`[auth] login: set refresh hash prefix=${refreshHash.slice(0, 8)}`);
  } catch (err) {}

  return res.json({ user: toSafeUser(updatedUser), accessToken });
}

async function forgotPassword(req, res) {
  const { email } = req.validated.body;
  const user = await getUserByEmail(email);

  // Always respond 200 to avoid account enumeration
  if (!user) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const resetTokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await setResetTokenForUser(user.id, resetTokenHash, expiresAt);

  // In production you would email the tokenized link.
  const response = { message: "If that email exists, a reset link has been sent." };
  if (!env.isProd) {
    response.resetToken = rawToken;
    response.resetUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/reset-password?token=${rawToken}`;
    console.info("[password-reset] dev token for", email, rawToken);
  }

  return res.json(response);
}

async function resetPassword(req, res) {
  const { token, password } = req.validated.body;
  const hashed = hashToken(token);
  const user = await getUserByResetTokenHash(hashed);

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const expiresAt = user.data?.resetTokenExpiresAt ? new Date(user.data.resetTokenExpiresAt) : null;
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    await clearResetTokenForUser(user.id);
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const passwordHash = await hashPassword(password);
  const accessToken = signAccessToken(user);

  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const refreshHash = hashToken(rawRefreshToken);
  const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await createSession({ userId: user.id, tokenHash: refreshHash, userAgent: req.get("user-agent"), ipAddress: req.ip, expiresAt: sessionExpiresAt });

  const updatedUser = await updateUser(user.id, { passwordHash });
  await clearResetTokenForUser(user.id);

  setRefreshCookie(res, rawRefreshToken);
  setAccessCookie(res, accessToken);

  return res.json({ user: toSafeUser(updatedUser), accessToken });
}

async function socialLogin(req, res) {
  const { provider, email, name } = req.validated.body;
  const providerKey = `${provider}Id`;

  let user = await getUserByEmail(email);
  if (!user) {
    const passwordHash = await hashPassword(crypto.randomBytes(12).toString("base64url"));
    const userId = createId("user");
    user = await createUser({
      id: userId,
      name,
      email,
      phone: null,
      type: "customer",
      passwordHash,
      refreshTokenHashes: [],
      data: { [providerKey]: `linked_${provider}_${userId}` },
    });
  } else {
    // tag provider on existing account
    const existingData = { ...(user.data || {}) };
    if (!existingData[providerKey]) {
      existingData[providerKey] = `linked_${provider}_${user.id}`;
      user = await updateUser(user.id, { data: existingData });
    }
  }

  const accessToken = signAccessToken(user);

  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const refreshHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await createSession({ userId: user.id, tokenHash: refreshHash, userAgent: req.get("user-agent"), ipAddress: req.ip, expiresAt });

  setRefreshCookie(res, rawRefreshToken);
  setAccessCookie(res, accessToken);

  const updatedUser = await getUserById(user.id);

  return res.json({ user: toSafeUser(updatedUser), accessToken, provider });
}

async function me(req, res) {
  const user = await getUserById(req.auth.userId);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({ user: toSafeUser(user) });
}

async function refresh(req, res) {
  const raw = req.cookies?.ll_refresh;
  if (!raw) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const tokenHash = hashToken(raw);
    const session = await getSessionByHash(tokenHash);
    if (!session || session.revoked || (session.expiresAt && new Date(session.expiresAt) < new Date())) {
      // eslint-disable-next-line no-console
      console.info('[auth] refresh: session invalid or expired');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await getUserById(session.userId);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const newAccessToken = signAccessToken(user);

    // rotate session token
    const newRaw = crypto.randomBytes(48).toString('hex');
    const newHash = hashToken(newRaw);
    const newExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await rotateSession(session.id, newHash, newExpires);

    setRefreshCookie(res, newRaw);
    setAccessCookie(res, newAccessToken);

    const refreshedUser = await getUserById(user.id);
    return res.json({ user: toSafeUser(refreshedUser), accessToken: newAccessToken });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.info('[auth] refresh: error', err?.message || err);
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

async function logout(req, res) {
  const refreshToken = req.cookies?.ll_refresh;

  if (refreshToken) {
    const refreshHash = hashToken(refreshToken);
    await revokeSessionByHash(refreshHash);
  }

  clearRefreshCookie(res);
  clearAccessCookie(res);
  return res.status(204).send();
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  socialLogin,
  me,
  refresh,
  logout,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  socialLoginSchema,
};
