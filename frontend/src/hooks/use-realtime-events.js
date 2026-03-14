import { useEffect, useRef } from "react";
import { getAccessToken, API_BASE_URL } from "@/lib/api";

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
];

let sharedSource = null;
let sharedToken = null;
let detachHandlers = null;
const subscribers = new Set();

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
  sharedToken = null;
}

function ensureSharedSource(token) {
  if (!token) return;

  if (sharedSource && sharedToken === token) {
    return;
  }

  closeSharedSource();

  const streamUrl = `${API_BASE_URL}/realtime/stream?token=${encodeURIComponent(token)}`;
  const source = new EventSource(streamUrl);

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
    // EventSource will retry automatically. Keep the shared instance unless
    // the last subscriber unsubscribes or the token changes.
  };

  source.addEventListener("error", errorListener);

  sharedSource = source;
  sharedToken = token;
  detachHandlers = () => {
    for (const { eventName, listener } of handlers) {
      source.removeEventListener(eventName, listener);
    }
    source.removeEventListener("error", errorListener);
  };
}

export function useRealtimeEvents(onEvent) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const token = getAccessToken();

  useEffect(() => {
    if (!token) return undefined;

    const subscriber = (eventName, payload) => {
      handlerRef.current?.(eventName, payload);
    };

    subscribers.add(subscriber);
    ensureSharedSource(token);

    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        closeSharedSource();
      }
    };
  }, [token]);
}
