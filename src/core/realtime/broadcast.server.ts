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
export async function broadcast(messages: Message[]): Promise<{ ok: boolean }> {
  if (messages.length === 0) return { ok: true };

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  const wireMessages = messages.map((m) => ({
    topic: topic(m.channel, m.id),
    event: m.event as string,
    payload: m.payload,
  }));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ messages: wireMessages }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[broadcast] HTTP ${res.status} for [${wireMessages.map((m) => `${m.topic}/${m.event}`).join(", ")}]:`,
        body
      );
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[broadcast] network error:", (err as Error).message, "url:", url);
    return { ok: false };
  }
}
