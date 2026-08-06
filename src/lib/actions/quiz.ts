"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { computeAndBroadcastLeaderboard } from "@/lib/actions/participants";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/core/domain/ids";
import { toPublicPoll } from "@/core/domain/poll";
import { broadcast } from "@/core/realtime/broadcast.server";
import { closeActivePoll, activateTargetPoll } from "@/server/polls/lifecycle";

function isValidUUID(s: string) { return isUuid(s); }

type ChampionshipSettings = {
  enabled: boolean;
  auto: boolean;
  reveal_duration: number;
};

export async function saveChampionshipSettings(
  sessionId: string,
  orgSlug: string,
  settings: ChampionshipSettings
): Promise<{ error: string } | { success: true }> {
  if (!isValidUUID(sessionId)) return { error: "Некорректный запрос" };
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const { data: sessionRow } = await admin
    .from("sessions")
    .select("settings")
    .eq("id", sessionId)
    .single();

  const existing = (sessionRow?.settings ?? {}) as Record<string, unknown>;
  await admin
    .from("sessions")
    .update({
      settings: { ...existing, championship: settings },
      // session.mode is the read-side source of truth (see migration 014)
      // — keep it in lockstep with the toggle so it never drifts again.
      mode: settings.enabled ? "quiz" : "conference",
    } as never)
    .eq("id", sessionId);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { success: true };
}

type AdvanceResult = "activated" | "finished" | "raced";

// Finds and activates the next draft quiz poll in the session.
// "raced" means a concurrent call already claimed the SAME next poll (see
// the compare-and-set below) — the caller must NOT treat that as "finished".
async function activateNextQuizPollInternal(
  sessionId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<AdvanceResult> {
  // Closing whatever's still active is not race-sensitive: by the time
  // this runs the poll has usually already been closed by its own
  // duration timer (DisplayScreen closes any poll — quiz or not — when
  // its countdown hits zero), so finding nothing "active" here is the
  // normal case, not a race. The actual race is in activateTargetPoll's
  // compare-and-set below, where two open display screens can both try
  // to claim the same next-draft poll.
  await closeActivePoll(admin, sessionId);

  const outcome = await activateTargetPoll(admin, sessionId, {
    kind: "nextDraft",
    type: "multiple_choice",
    requireQuizMode: true,
  });

  if (outcome.status === "not_found") return "finished";
  if (outcome.status === "raced") return "raced";

  await broadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "poll_change",
    payload: { type: "activated", poll: toPublicPoll(outcome.poll) },
  }]);

  return "activated";
}

export async function startChampionship(
  sessionId: string
): Promise<{ error: string } | { success: true }> {
  if (!isValidUUID(sessionId)) return { error: "Некорректный запрос" };
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  // Broadcast lobby close + championship start
  await broadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "quiz_start",
    payload: {},
  }]);

  // Activate first quiz poll
  const result = await activateNextQuizPollInternal(sessionId, admin);
  if (result !== "activated") return { error: "Нет вопросов для чемпионата" };

  return { success: true };
}

export async function activateNextChampionshipPoll(
  sessionId: string
): Promise<{ error: string } | { success: true; finished: boolean }> {
  if (!isValidUUID(sessionId)) return { error: "Некорректный запрос" };
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const result = await activateNextQuizPollInternal(sessionId, admin);
  if (result === "raced") {
    // A concurrent call (e.g. a second open display screen) already
    // claimed this advance — nothing more for this call to do.
    return { success: true, finished: false };
  }
  if (result === "finished") {
    await finishChampionshipInternal(sessionId, admin);
    return { success: true, finished: true };
  }
  return { success: true, finished: false };
}

async function finishChampionshipInternal(
  sessionId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<void> {
  await computeAndBroadcastLeaderboard(sessionId, admin);

  // Also broadcast quiz_finish so screens show final state
  await broadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "quiz_finish",
    payload: {},
  }]);
}

export async function finishChampionship(
  sessionId: string
): Promise<{ error: string } | { success: true }> {
  if (!isValidUUID(sessionId)) return { error: "Некорректный запрос" };
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  // Close any active poll
  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() } as never)
    .eq("session_id", sessionId)
    .eq("status", "active");

  await finishChampionshipInternal(sessionId, admin);
  return { success: true };
}
