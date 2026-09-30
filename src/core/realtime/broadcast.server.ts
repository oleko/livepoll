import { topic, type ChannelKey } from "./channels";
import type { EventMap } from "./events";

type MessageFor<K extends ChannelKey> = {
  [E in keyof EventMap[K]]: { channel: K; id: string; event: E; payload: EventMap[K][E] };
}[keyof EventMap[K]];

/** A realtime message for any of the five channels, fully typed to its own event/payload shape. */
export type Message = { [K in ChannelKey]: MessageFor<K> }[ChannelKey];

/**
 * The single sender for Supabase Broadcast, replacing 7 copy-pasted versions
 * across polls.ts, slides.ts, quiz.ts (x2), participants.ts (x2), sessions.ts —
 * four of which silently swallowed failures. Always logs on failure, never throws.
 */
const TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 300;

export async function broadcast(messages: Message[]): Promise<{ ok: boolean }> {
  if (messages.length === 0) return { ok: true };

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  const wireMessages = messages.map((m) => ({
    topic: topic(m.channel, m.id),
    event: m.event as string,
    payload: m.payload,
  }));
  const label = wireMessages.map((m) => `${m.topic}/${m.event}`).join(", ");

  // A dropped broadcast is what the room actually sees: the host presses
  // "запустить" and the projector does not change. It used to be a single
  // attempt with no timeout at all — a hung connection would block the server
  // action until the platform gave up. One retry covers the common transient
  // failure without turning a real outage into a long stall.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        body: JSON.stringify({ messages: wireMessages }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return { ok: true };

      const body = await res.text().catch(() => "");
      console.error(`[broadcast] HTTP ${res.status} for [${label}] (attempt ${attempt + 1}):`, body);
      // 4xx is our own bad request — retrying sends the same thing again.
      if (res.status < 500) return { ok: false };
    } catch (err) {
      console.error(`[broadcast] network error (attempt ${attempt + 1}):`, (err as Error).message, "url:", url);
    }

    if (attempt === 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }

  return { ok: false };
}
