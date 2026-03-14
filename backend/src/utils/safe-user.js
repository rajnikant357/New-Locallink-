function toSafeUser(user) {
  if (!user) return null;
  const { passwordHash, refreshTokenHashes, ...rest } = user;
  return rest;
}

module.exports = { toSafeUser };
