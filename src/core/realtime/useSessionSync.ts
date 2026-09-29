"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One reconnect policy for every realtime surface. Previously DisplayScreen
 * and VoteInterface each hand-rolled their own version, and only DisplayScreen's
 * resynced BOTH the active poll and the active slide on first connect — a
 * participant who loaded the page while a broadcast was in flight kept stale
 * slide state forever, since VoteInterface's copy only resynced the poll.
 *
 * `resync` fires on the first successful subscribe AND after every drop.
 * The earlier split of `onFirstConnect` / `onReconnect` looked like it covered
 * both, but didn't: `onFirstConnect` sat behind a once-per-mount flag, and both
 * callers passed `router.refresh()` as `onReconnect` — which cannot restore
 * anything, because the refreshed props feed `useState` initialisers on a
 * component that is never remounted (no `key`). So nothing was re-read after a
 * drop, and every broadcast missed while the socket was down stayed missed:
 * the projector kept showing a poll that had already been closed, and vote
 * counts drifted from the database for the rest of the event.
 */
export function useSessionSync(opts: {
  resync: () => void | Promise<void>;
}) {
  const hasEverConnected = useRef(false);
  const wasDisconnected = useRef(false);
  const [connected, setConnected] = useState(true);
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  const handleStatus = useCallback((status: string) => {
    const isConnected = status === "SUBSCRIBED";
    if (isConnected) {
      if (!hasEverConnected.current || wasDisconnected.current) {
        wasDisconnected.current = false;
        void optsRef.current.resync();
      }
      hasEverConnected.current = true;
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      if (hasEverConnected.current) wasDisconnected.current = true;
    }
    setConnected(isConnected || !hasEverConnected.current);
  }, []);

  return { connected, handleStatus };
}
