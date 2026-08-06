import type { createAdminClient } from "@/lib/supabase/admin";
import type { PollType } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

export type PollLifecycleRow = {
  id: string;
  title: string;
  type: PollType;
  options: unknown[];
  status: string;
  settings: Record<string, unknown> | null;
};

export type ClosedPoll = { id: string; settings: Record<string, unknown> | null };

/**
 * Closes whatever poll is currently active in the session, if any. Not
 * race-sensitive: by the time some callers run this (e.g. championship
 * auto-advance), the poll has usually already been closed by its own
 * duration timer on the display screen — finding nothing "active" here is
 * the normal steady state, not a lost race. A plain unconditional close is
 * correct either way.
 */
export async function closeActivePoll(admin: Admin, sessionId: string): Promise<ClosedPoll | null> {
  const { data: prevActive } = await admin
    .from("polls")
    .select("id, settings")
    .eq("session_id", sessionId)
    .eq("status", "active")
    .maybeSingle();

  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() } as never)
    .eq("session_id", sessionId)
    .eq("status", "active");

  return prevActive ?? null;
}

export type ActivateTarget =
  | { kind: "id"; pollId: string }
  | { kind: "nextDraft"; type: PollType; requireQuizMode?: boolean };

export type ActivateOutcome =
  | { status: "activated"; poll: PollLifecycleRow }
  | { status: "raced" }
  | { status: "not_found" };

/**
 * Activates a target poll via compare-and-set on `status = "draft"`. For
 * `kind: "id"` targets (host clicks "launch") this is effectively
 * uncontested — the UI only offers that action on draft polls — but the
 * same guard turns an accidental double-click into a no-op instead of a
 * duplicate activation. For `kind: "nextDraft"` targets (championship
 * auto-advance) this is the actual race: two open display screens can both
 * select the same next-draft poll before either commits, and the UPDATE's
 * WHERE clause is re-checked atomically at write time — only the first
 * caller's write matches, the second gets zero affected rows back.
 */
export async function activateTargetPoll(
  admin: Admin,
  sessionId: string,
  target: ActivateTarget
): Promise<ActivateOutcome> {
  let pollId: string;
  let existingSettings: Record<string, unknown>;

  if (target.kind === "id") {
    const { data: poll } = await admin
      .from("polls")
      .select("settings")
      .eq("id", target.pollId)
      .eq("session_id", sessionId)
      .single();
    if (!poll) return { status: "not_found" };
    pollId = target.pollId;
    existingSettings = (poll.settings ?? {}) as Record<string, unknown>;
  } else {
    const { data: nextPoll } = await admin
      .from("polls")
      .select("id, settings")
      .eq("session_id", sessionId)
      .eq("status", "draft")
      .eq("type", target.type)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (!nextPoll) return { status: "not_found" };

    const settings = (nextPoll.settings ?? {}) as Record<string, unknown>;
    if (target.requireQuizMode && !settings.quiz_mode) {
      // Not a quiz question (shouldn't happen in championship, but be
      // safe) — close it and keep looking.
      await admin
        .from("polls")
        .update({ status: "closed", closed_at: new Date().toISOString() } as never)
        .eq("id", nextPoll.id);
      return activateTargetPoll(admin, sessionId, target);
    }
    pollId = nextPoll.id;
    existingSettings = settings;
  }

  const updatedSettings = { ...existingSettings, activated_at: new Date().toISOString() };
  const { data: activatedRows } = await admin
    .from("polls")
    .update({ status: "active", settings: updatedSettings } as never)
    .eq("id", pollId)
    .eq("status", "draft")
    .select("id");

  if ((activatedRows ?? []).length === 0) {
    return { status: "raced" };
  }

  const { data: activatedPoll } = await admin
    .from("polls")
    .select("id, title, type, options, status, settings")
    .eq("id", pollId)
    .single();

  if (!activatedPoll) return { status: "not_found" };
  return { status: "activated", poll: activatedPoll as PollLifecycleRow };
}
