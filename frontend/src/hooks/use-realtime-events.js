import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/api";

const EVENT_NAMES = [
  "connected",
  "ping",
  "message.new",
  "message.updated",
  "message.deleted",
  "notification.new",
  "notification.updated",
  "notification.bulkUpdated",
  "booking.new",
  "booking.updated",
  "hurry.new",
  "hurry.accepted",
  "hurry.cancelled",
];

let sharedSource = null;
let detachHandlers = null;
const subscribers = new Set();
let pollingInterval = null;
let cachedConversations = new Map();
let seenNotificationIds = new Set();

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function broadcast(eventName, payload) {
  for (const subscriber of subscribers) {
    subscriber(eventName, payload);
  }
}

function closeSharedSource() {
  detachHandlers?.();
  detachHandlers = null;
  sharedSource?.close();
  sharedSource = null;
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function ensureSharedSource() {
  if (sharedSource) return;

  // If there are no auth cookies present, don't open SSE or seed protected endpoints.
  try {
    if (typeof document !== "undefined") {
      const cookies = document.cookie || "";
      if (!cookies.includes("ll_session") && !cookies.includes("ll_access")) {
        // Cookies may be set by the login response slightly after this code runs.
        // Retry a few times with small delay to avoid a race between login response
        // and the SSE/poll seed fetches which would otherwise return 401.
        const retryOpen = (attempt = 1) => {
          if (attempt > 5) return;
          setTimeout(() => {
            const newCookies = document.cookie || "";
            if (newCookies.includes("ll_session") || newCookies.includes("ll_access")) {
              // Attempt to open now
              try {
                ensureSharedSource();
              } catch {
                // ignore
              }
              return;
            }
            retryOpen(attempt + 1);
          }, 200 * attempt);
        };

        retryOpen();
        return;
      }
    }
  } catch {
    // ignore environment where document isn't available
  }

  const streamUrl = `${API_BASE_URL}/realtime/stream`;
  const source = new EventSource(streamUrl, { withCredentials: true });

  const handlers = EVENT_NAMES.map((eventName) => {
    const listener = (event) => {
      const payload = safeParse(event.data);
      if (payload) {
        broadcast(eventName, payload);
      }
    };

    source.addEventListener(eventName, listener);
    return { eventName, listener };
  });

  const errorListener = () => {
    // EventSource will retry automatically. If SSE errors before opening,
    // start polling as a fallback. Keep the shared instance unless the last
    // subscriber unsubscribes or the token changes.
    console.debug("SSE error on /realtime/stream");
    if (!sseOpened) startPolling?.();
  };

  source.addEventListener("error", errorListener);

  let sseOpened = false;
  const openListener = () => {
    sseOpened = true;
    console.debug("SSE opened, disabling polling");
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  source.addEventListener("open", openListener);

  sharedSource = source;
  detachHandlers = () => {
    for (const { eventName, listener } of handlers) {
      source.removeEventListener(eventName, listener);
    }
    source.removeEventListener("error", errorListener);
    source.removeEventListener("open", openListener);
  };

  // Polling fallback: only start if SSE doesn't open within a short timeout
  // or if SSE later reports an error. Seed caches once to avoid firing events
  // for existing items.
  (async () => {
    try {
      const seedConvRes = await fetch(`${API_BASE_URL}/messages/conversations/me`, { credentials: "include" });
      if (seedConvRes.ok) {
        const seedJson = await seedConvRes.json();
        const seedConvs = seedJson.conversations || [];
        for (const conv of seedConvs) {
          const otherId = conv.user?.id;
          const last = conv.lastMessage;
          if (otherId && last) cachedConversations.set(otherId, last.id);
        }
      }

      const seedNotifRes = await fetch(`${API_BASE_URL}/notifications/me?unreadOnly=true&includeMessage=true`, { credentials: "include" });
      if (seedNotifRes.ok) {
        const seedNotifJson = await seedNotifRes.json();
        const seedNotifs = seedNotifJson.notifications || [];
        for (const n of seedNotifs) seenNotificationIds.add(n.id);
      }
    } catch (err) {
      // ignore seed errors
    }
  })();

  const startPolling = () => {
    if (pollingInterval) return;
    console.debug("Starting polling fallback for conversations/notifications");
    pollingInterval = setInterval(async () => {
      console.debug("Polling: fetching conversations and notifications");
      try {
        const convRes = await fetch(`${API_BASE_URL}/messages/conversations/me`, { credentials: "include" });
        if (convRes.ok) {
          const convJson = await convRes.json();
          const conversations = convJson.conversations || [];
          for (const conv of conversations) {
            const otherId = conv.user?.id;
            const last = conv.lastMessage;
            if (!otherId || !last) continue;
            const prev = cachedConversations.get(otherId);
            if (!prev || prev !== last.id) {
              broadcast("message.new", { message: last });
              cachedConversations.set(otherId, last.id);
            }
          }
        }

        const notifRes = await fetch(`${API_BASE_URL}/notifications/me?unreadOnly=true&includeMessage=true`, { credentials: "include" });
        if (notifRes.ok) {
          const notifJson = await notifRes.json();
          const notifications = notifJson.notifications || [];
          for (const n of notifications) {
            if (!seenNotificationIds.has(n.id)) {
              seenNotificationIds.add(n.id);
              broadcast("notification.new", { notification: n });
            }
          }
        }
      } catch (err) {
        // ignore polling errors
      }
    }, 8000);
  };

  // If SSE doesn't open quickly, start polling as a fallback.
  setTimeout(() => {
    if (!sseOpened) startPolling();
  }, 2000);
}

export function useRealtimeEvents(onEvent, enabled = true) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return () => {};

    const subscriber = (eventName, payload) => {
      handlerRef.current?.(eventName, payload);
    };

    subscribers.add(subscriber);
    ensureSharedSource();

    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        closeSharedSource();
      }
    };
  }, [enabled]);
}
