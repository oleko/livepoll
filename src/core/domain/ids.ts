// Session/poll/voter identifiers. Kept as plain string aliases (not nominally
// branded) to avoid forcing casts through ~30 existing call sites in one pass —
// the validator is what matters, and it replaces 3 duplicated UUID_RE/isValidUUID
// copies (polls.ts, quiz.ts, participants.ts).

export type SessionId = string;
export type PollId = string;
export type SlideId = string;
export type VoterToken = string;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}
