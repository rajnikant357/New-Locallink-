const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
let refreshPromise = null;

async function request(path, options = {}) {
  const { _retry, ...fetchOptions } = options;
  const headers = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...fetchOptions,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function refreshSession() {
  const payload = await request("/auth/refresh", { method: "POST" });
  return payload;
}

async function ensureSingleRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function api(path, options = {}) {
  try {
    return await request(path, options);
  } catch (error) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const skipRefreshPaths = new Set(["/auth/login", "/auth/register", "/auth/refresh"]);
    const shouldTryRefresh = !skipRefreshPaths.has(normalizedPath);

    if (error.status === 401 && !options._retry && shouldTryRefresh) {
      try {
        await ensureSingleRefresh();
      } catch (refreshError) {
        throw refreshError;
      }
      return request(path, { ...options, _retry: true });
    }
    throw error;
  }
}

export { API_BASE_URL };