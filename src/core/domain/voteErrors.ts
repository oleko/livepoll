/**
 * Stable codes for the refusals a participant can receive.
 *
 * Before this, the two submit paths in VoteInterface failed in opposite ways:
 * `handleVote` threw the server's message away and showed a generic "ошибка,
 * попробуйте снова" for everything except "вы уже проголосовали" — so a
 * participant whose poll had just closed was invited to retry, which can only
 * fail again. `handleSubmitQuestion` did the reverse and rendered
 * `result.error` verbatim, which on one path is the raw Postgres message.
 *
 * A code travels instead of prose: the client decides the wording (and can
 * translate it), and the server never has to choose between being useful and
 * not leaking internals.
 */
export type VoteErrorCode =
  | "invalid"           // malformed input — should not happen from our own UI
  | "closed"            // poll is no longer active
  | "expired"           // timed poll ran out
  | "already_voted"
  | "too_many_answers"
  | "participant_limit" // plan limit reached
  | "rate_limited"
  | "question_limit"   // per-voter cap on questions in this session
  | "not_found"
  | "failed";           // anything unexpected; details stay in the server log

export type VoteError = { error: string; code: VoteErrorCode };

/** Keeps the Russian fallback text next to its code, for non-UI callers. */
export function voteError(code: VoteErrorCode, error: string): VoteError {
  return { error, code };
}
