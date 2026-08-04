"use client";

import { useCallback, useRef, useState } from "react";

/**
 * One reconnect policy for every realtime surface. Previously DisplayScreen
 * and VoteInterface each hand-rolled their own version, and only DisplayScreen's
 * resynced BOTH the active poll and the active slide on first connect — a
 * participant who loaded the page while a broadcast was in flight kept stale
 * slide state forever, since VoteInterface's copy only resynced the poll.
 *
 * `onFirstConnect` should resync whatever state this surface owns (poll,
 * slide, ...) directly from the database. `onReconnect` fires after a drop
 * and should refresh anything that can't be losslessly resynced client-side.
 */
export function useSessionSync(opts: {
  onFirstConnect: () => void | Promise<void>;
  onReconnect: () => void;
}) {
  const hasEverConnected = useRef(false);
  const wasDisconnected = useRef(false);
  const [connected, setConnected] = useState(true);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const handleStatus = useCallback((status: string) => {
    const isConnected = status === "SUBSCRIBED";
    if (isConnected) {
      if (!hasEverConnected.current) {
        void optsRef.current.onFirstConnect();
      } else if (wasDisconnected.current) {
        wasDisconnected.current = false;
        optsRef.current.onReconnect();
      }
      hasEverConnected.current = true;
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      if (hasEverConnected.current) wasDisconnected.current = true;
    }
    setConnected(isConnected || !hasEverConnected.current);
  }, []);

  return { connected, handleStatus };
}
