const { verifyAccessToken } = require("../utils/tokens");
const { getUserById } = require("../db/repository");

async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.auth = {
      userId: user.id,
      role: user.type,
      email: user.email,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = {
  authRequired,
  requireRole,
};
