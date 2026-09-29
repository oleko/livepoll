"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PollType } from "@/types/database";
import type { QuestionRow } from "@/core/domain/question";

/**
 * The one way a live screen re-reads its own state from the database.
 *
 * Replaces the three hand-rolled `.from()` calls that DisplayScreen and
 * VoteInterface each ran on connect (polls → sessions → session_slides).
 * Those had three problems this hook exists to remove:
 *
 *  - They took any failure for "nothing is active": only `data` was read,
 *    `error` was dropped, and the result was written straight into state as
 *    `?? null`. One failed request blanked the projector to the join screen.
 *    Here a failed resync leaves state untouched and raises `stale` instead.
 *  - They read tables directly, which is why anon needed blanket SELECT on
 *    polls and votes — the hole that exposed quiz answers (see migration 016).
 *    One `security definer` RPC serves the same data already sanitized.
 *  - They were copies of each other that had already drifted apart.
 *
 * `apply` is called only with a real snapshot, never on failure.
 */
export type SessionStateSnapshot = {
  session: { id: string; status: string; total_attendees: number };
  poll: {
    id: string;
    title: string;
    type: PollType;
    options: unknown[];
    status: string;
    settings?: Record<string, unknown>;
  } | null;
  votes: { value: string }[];
  questions: QuestionRow[];
  slide: { id: string; type: string; content: Record<string, unknown> } | null;
  joined_count: number;
};

const RETRY_DELAYS_MS = [1000, 3000, 7000];

export function useSessionState(
  joinCode: string,
  apply: (snapshot: SessionStateSnapshot) => void
): { resync: () => Promise<void>; stale: boolean } {
  const applyRef = useRef(apply);
  useEffect(() => { applyRef.current = apply; });

  const supabase = useRef(createClient());
  const [stale, setStale] = useState(false);
  // A resync already in flight is reused rather than raced: a flapping
  // connection can fire SUBSCRIBED several times in a row.
  const inFlight = useRef<Promise<void> | null>(null);

  const run = useCallback(async () => {
    for (let attempt = 0; ; attempt++) {
      const { data, error } = await supabase.current.rpc("get_session_state", {
        p_join_code: joinCode,
      });

      if (!error) {
        setStale(false);
        // `null` means no session with this code — nothing to say about the
        // screen's state, so say nothing rather than blanking it.
        if (data) applyRef.current(data as SessionStateSnapshot);
        return;
      }

      if (attempt >= RETRY_DELAYS_MS.length) {
        setStale(true);
        return;
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }, [joinCode]);

  const resync = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const p = run().finally(() => { inFlight.current = null; });
    inFlight.current = p;
    return p;
  }, [run]);

  return { resync, stale };
}
