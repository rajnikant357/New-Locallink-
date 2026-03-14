const crypto = require("crypto");
const { z } = require("zod");
const { hashPassword, verifyPassword } = require("../utils/password");
const { toSafeUser } = require("../utils/safe-user");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../utils/tokens");
const { env } = require("../config/env");
const { registerBodySchema } = require("../schemas/account.schemas");
const {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getUserByRefreshTokenHash,
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

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function setRefreshCookie(res, token) {
  res.cookie("ll_refresh", token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("ll_refresh", {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/api/v1/auth",
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
  const refreshToken = signRefreshToken(createdUser);
  const refreshHash = hashToken(refreshToken);

  const updatedUser = await updateUser(createdUser.id, { refreshTokenHashes: [refreshHash] });

  setRefreshCookie(res, refreshToken);

  return res.status(201).json({
    user: toSafeUser(updatedUser),
    accessToken,
  });
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
  const refreshToken = signRefreshToken(user);
  const refreshHash = hashToken(refreshToken);

  const updatedUser = await updateUser(user.id, { refreshTokenHashes: [refreshHash] });

  setRefreshCookie(res, refreshToken);

  return res.json({
    user: toSafeUser(updatedUser),
    accessToken,
  });
}

async function me(req, res) {
  const user = await getUserById(req.auth.userId);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({ user: toSafeUser(user) });
}

async function refresh(req, res) {
  const refreshToken = req.cookies?.ll_refresh;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const refreshHash = hashToken(refreshToken);
    const user = await getUserById(payload.sub);

    if (!user || !Array.isArray(user.refreshTokenHashes) || !user.refreshTokenHashes.includes(refreshHash)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    const newRefreshHash = hashToken(newRefreshToken);

    const refreshedUser = await updateUser(user.id, { refreshTokenHashes: [newRefreshHash] });

    setRefreshCookie(res, newRefreshToken);

    return res.json({
      user: toSafeUser(refreshedUser),
      accessToken: newAccessToken,
    });
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
}

async function logout(req, res) {
  const refreshToken = req.cookies?.ll_refresh;

  if (refreshToken) {
    const refreshHash = hashToken(refreshToken);
    const user = await getUserByRefreshTokenHash(refreshHash);
    if (user) {
      const updatedHashes = (user.refreshTokenHashes || []).filter((hash) => hash !== refreshHash);
      await updateUser(user.id, { refreshTokenHashes: updatedHashes });
    }
  }

  clearRefreshCookie(res);
  return res.status(204).send();
}

module.exports = {
  register,
  login,
  me,
  refresh,
  logout,
  registerSchema,
  loginSchema,
};
