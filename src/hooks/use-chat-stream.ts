"use client";

import { useEffect, useRef } from "react";
import type { RtEvent } from "@/server/services/messaging/realtime"; // type-only: erased, no server code pulled in

/**
 * Opens a single SSE connection to /api/realtime and hands every event to the
 * caller. EventSource auto-reconnects on drop; `: ping` heartbeats are ignored
 * (they aren't `data:` events). The callback is kept in a ref so re-renders
 * don't churn the connection.
 */
export function useChatStream(onEvent: (ev: RtEvent) => void) {
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    const es = new EventSource("/api/realtime");
    es.onmessage = (e) => {
      try {
        cb.current(JSON.parse(e.data) as RtEvent);
      } catch {
        /* ignore non-JSON keepalives */
      }
    };
    return () => es.close();
  }, []);
}
