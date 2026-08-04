// The five Supabase Broadcast channels used across the app. Adding a new
// channel key here is the ONLY way to make it usable — `useChannel` and
// `broadcast()` both require a `ChannelKey`, so a typo'd or ad-hoc topic
// string (e.g. "presenter-polls", "champ-lobby-<id>") fails to compile
// instead of silently going nowhere.

export const CHANNELS = {
  sessionPolls: "session-polls",
  sessionSlides: "session-slides",
  sessionQuestions: "session-questions",
  pollVotes: "poll-votes",
  sessionBuzz: "session-buzz",
} as const;

export type ChannelKey = keyof typeof CHANNELS;

export function topic(channel: ChannelKey, id: string): string {
  return `${CHANNELS[channel]}:${id}`;
}
