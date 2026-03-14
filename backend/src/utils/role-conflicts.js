function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertProviderProfileAllowed(user) {
  if (user.type !== "provider") {
    throw createHttpError("Only provider accounts can own provider profiles", 403);
  }
}

function assertRoleChangeAllowed(user, targetType, ownsProviderProfile = false) {
  if (user.type === "admin" && targetType !== "admin") {
    throw createHttpError("Admin accounts cannot be changed to customer or provider", 403);
  }

  if (ownsProviderProfile && targetType !== "provider") {
    throw createHttpError("User has a provider profile. Remove provider profile before changing role", 409);
  }
}

module.exports = {
  assertProviderProfileAllowed,
  assertRoleChangeAllowed,
};
