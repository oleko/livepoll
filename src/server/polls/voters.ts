import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Unique voters across a whole session, counted by the database.
 *
 * Three places used to do this by hand — checkParticipantLimit and
 * broadcastVoteEffects on every vote, and the display page on every load:
 * fetch every poll id of the session, then every voter_token of those polls,
 * then build a Set in Node. Besides the load that puts on a 1.6GB box,
 * PostgREST caps a response at 1000 rows by default, so past the thousandth
 * vote the count silently came back short — the plan's participant limit
 * stopped applying and the "N участников" counter froze, with no error raised.
 */
export async function countSessionVoters(admin: Admin, sessionId: string): Promise<number> {
  const { data, error } = await admin.rpc("count_session_voters", { p_session_id: sessionId });
  if (error) {
    console.error("[count_session_voters]", error.message);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}

/** Whether this token already voted anywhere in the session (exempt from the limit). */
export async function hasVotedInSession(
  admin: Admin,
  sessionId: string,
  voterToken: string
): Promise<boolean> {
  const { data, error } = await admin.rpc("has_voted_in_session", {
    p_session_id: sessionId,
    p_voter_token: voterToken,
  });
  if (error) {
    console.error("[has_voted_in_session]", error.message);
    // Fail open: a returning voter wrongly treated as new would be refused
    // mid-event over a transient database error. The limit is a billing
    // guard, not a security boundary.
    return true;
  }
  return data === true;
}
