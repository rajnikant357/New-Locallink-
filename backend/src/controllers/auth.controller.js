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
  getSessionById,
  revokeSessionById,
  updateSessionExpiration,
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

function setSessionCookie(res, sessionId) {
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  res.cookie("ll_session", sessionId, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    expires: sessionExpiresAt,
  });
}

function clearSessionCookie(res) {
  res.clearCookie("ll_session", {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    path: "/",
  });
}

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
    data: {},
  });

  const accessToken = signAccessToken(createdUser);

  // Create server-side session
  const session = await createSession({
    userId: createdUser.id,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });

  // Set session cookie
  setSessionCookie(res, session.id);
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

  // Create server-side session
  const session = await createSession({
    userId: user.id,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });

  setSessionCookie(res, session.id);
  setAccessCookie(res, accessToken);

  const updatedUser = await getUserById(user.id);

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

  // Create server-side session
  const session = await createSession({
    userId: user.id,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });

  const updatedUser = await updateUser(user.id, { passwordHash });
  await clearResetTokenForUser(user.id);

  setSessionCookie(res, session.id);
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

  // Create server-side session
  const session = await createSession({
    userId: user.id,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });

  setSessionCookie(res, session.id);
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
  const sessionId = req.cookies?.ll_session;
  if (!sessionId) {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }

  try {
    const session = await getSessionById(sessionId);
    if (!session || session.revoked) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    // Check if session has expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await revokeSessionById(sessionId);
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const newAccessToken = signAccessToken(user);

    // Extend the session expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Extend by 7 days
    await updateSessionExpiration(sessionId, expiresAt);

    setAccessCookie(res, newAccessToken);

    const refreshedUser = await getUserById(user.id);
    return res.json({ user: toSafeUser(refreshedUser), accessToken: newAccessToken });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[auth] refresh: error', err?.message || err);
    return res.status(401).json({ message: 'Session refresh failed' });
  }
}

async function logout(req, res) {
  const sessionId = req.cookies?.ll_session;

  if (sessionId) {
    await revokeSessionById(sessionId);
  }

  clearSessionCookie(res);
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
