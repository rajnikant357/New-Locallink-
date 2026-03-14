const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.type,
      email: user.email,
    },
    env.accessTokenSecret,
    { expiresIn: env.accessTokenExpiresIn },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      tokenType: "refresh",
    },
    env.refreshTokenSecret,
    { expiresIn: env.refreshTokenExpiresIn },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.accessTokenSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.refreshTokenSecret);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
