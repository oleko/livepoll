"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { topic, type ChannelKey } from "./channels";
import type { EventMap } from "./events";

type Handlers<K extends ChannelKey> = Partial<{
  [E in keyof EventMap[K]]: (payload: EventMap[K][E]) => void;
}>;

type RealtimeChannel = ReturnType<ReturnType<typeof createClient>["channel"]>;

/**
 * The single client-side subscriber for Supabase Broadcast channels.
 * `channel` must be one of the five known ChannelKeys — this is what makes
 * orphan topics (presenter-*, champ-lobby-*) a compile error instead of a
 * silently-dead subscription.
 *
 * `id` may be null/undefined to skip subscribing (e.g. no active poll yet).
 * Handlers are read from a ref on every event, so the latest closure is
 * always used without needing to resubscribe when handler identities change.
 */
export function useChannel<K extends ChannelKey>(
  channel: K,
  id: string | null | undefined,
  handlers: Handlers<K>,
  options?: { onStatus?: (status: string) => void }
): { send: <E extends keyof EventMap[K]>(event: E, payload: EventMap[K][E]) => void } {
  const handlersRef = useRef(handlers);
  const statusRef = useRef(options?.onStatus);
  const chRef = useRef<RealtimeChannel | null>(null);

  // Keep the refs current without mutating them during render.
  useEffect(() => {
    handlersRef.current = handlers;
    statusRef.current = options?.onStatus;
  });

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let ch = supabase.channel(topic(channel, id));
    for (const event of Object.keys(handlersRef.current)) {
      ch = ch.on("broadcast", { event }, ({ payload }: { payload: unknown }) => {
        const fn = handlersRef.current[event as keyof Handlers<K>];
        (fn as ((p: unknown) => void) | undefined)?.(payload);
      });
    }
    ch.subscribe((status: string) => statusRef.current?.(status));
    chRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      chRef.current = null;
    };
    // Handler event *set* is static per call site; only channel/id should resubscribe.
  }, [channel, id]);

  const send = useCallback(<E extends keyof EventMap[K]>(event: E, payload: EventMap[K][E]) => {
    chRef.current?.send({ type: "broadcast", event: event as string, payload });
  }, []);

  return { send };
}
