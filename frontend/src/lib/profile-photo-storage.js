function normalizeScope(type, userId) {
  const role = type || "customer";
  const id = userId || "anonymous";
  return `${role}:${id}`;
}

export function getProfilePhotoStorageKey(type, userId) {
  return `locallink_profile_photo_v2_${normalizeScope(type, userId)}`;
}

export function readProfilePhoto(type, userId) {
  const key = getProfilePhotoStorageKey(type, userId);
  return localStorage.getItem(key) || "";
}

export function writeProfilePhoto(type, userId, dataUrl) {
  const key = getProfilePhotoStorageKey(type, userId);
  if (!dataUrl) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, dataUrl);
}

