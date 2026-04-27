const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
let refreshPromise = null;
const requestCache = new Map(); // Cache concurrent identical requests to avoid hammering the API

async function request(path, options = {}) {
  const { _retry, _skipCache, ...fetchOptions } = options;
  
  // Create a cache key from method + path to deduplicate concurrent identical requests
  const method = fetchOptions.method || "GET";
  const cacheKey = `${method}:${path}`;
  
  // If this exact request is already in flight and not a retry, reuse that promise
  if (!_skipCache && requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }
  
  const headers = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers || {}),
  };

  const fetchPromise = (async () => {
    try {
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
    } finally {
      // Clean cache entry after request completes
      requestCache.delete(cacheKey);
    }
  })();

  // Cache the promise for this request while it's in flight
  requestCache.set(cacheKey, fetchPromise);
  
  return fetchPromise;
}

export async function refreshSession() {
  const payload = await request("/auth/refresh", { method: "POST", _skipCache: true });
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
    // Normalize path and check if this is a refresh request itself
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const skipRefreshPaths = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/forgot", "/auth/reset", "/auth/social"]);
    const isRefreshRequest = skipRefreshPaths.has(normalizedPath);

    // Only retry once per request, and never retry auth endpoints
    if (error.status === 401 && !options._retry && !isRefreshRequest) {
      try {
        await ensureSingleRefresh();
        return request(path, { ...options, _retry: true, _skipCache: true });
      } catch (refreshError) {
        // If refresh itself fails, don't retry the original request; just throw the original 401
        throw error;
      }
    }
    throw error;
  }
}

export { API_BASE_URL };