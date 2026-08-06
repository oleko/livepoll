"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { computeAndBroadcastLeaderboard } from "@/lib/actions/participants";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/core/domain/ids";
import { toPublicPoll } from "@/core/domain/poll";
import { broadcast } from "@/core/realtime/broadcast.server";

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
    .update({ settings: { ...existing, championship: settings } } as never)
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
  type PollRow = { id: string; settings: Record<string, unknown> | null; sort_order: number };

  // Close whatever's still active, if anything. Not race-sensitive: by the
  // time this runs the poll has usually already been closed by its own
  // duration timer (DisplayScreen closes any poll — quiz or not — when its
  // countdown hits zero), so finding nothing "active" here is the normal
  // case, not a race. A plain unconditional close is correct either way.
  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() } as never)
    .eq("session_id", sessionId)
    .eq("status", "active");

  // Find next draft quiz poll by sort_order
  const { data: nextPoll } = await admin
    .from("polls")
    .select("id, settings, sort_order")
    .eq("session_id", sessionId)
    .eq("status", "draft")
    .eq("type", "multiple_choice")
    .order("sort_order")
    .limit(1)
    .maybeSingle() as { data: PollRow | null };

  if (!nextPoll) return "finished";

  // Only activate if it's a quiz poll
  const settings = (nextPoll.settings ?? {}) as Record<string, unknown>;
  if (!settings.quiz_mode) {
    // Skip non-quiz polls recursively (shouldn't happen in championship but be safe)
    await admin.from("polls").update({ status: "closed", closed_at: new Date().toISOString() } as never).eq("id", nextPoll.id);
    return activateNextQuizPollInternal(sessionId, admin);
  }

  // Compare-and-set: this is the actual race — two open display screens
  // can both select the same "next draft" poll before either commits. The
  // `.eq("status", "draft")` is re-checked atomically by Postgres at
  // UPDATE time; only the first caller's write matches, the second gets
  // zero affected rows back and knows it lost.
  const updatedSettings = { ...settings, activated_at: new Date().toISOString() };
  const { data: activatedRows } = await admin
    .from("polls")
    .update({ status: "active", settings: updatedSettings } as never)
    .eq("id", nextPoll.id)
    .eq("status", "draft")
    .select("id");

  if ((activatedRows ?? []).length === 0) {
    return "raced";
  }

  const { data: activatedPoll } = await admin
    .from("polls")
    .select("id, title, type, options, status, settings")
    .eq("id", nextPoll.id)
    .single();

  if (activatedPoll) {
    await broadcast([{
      channel: "sessionPolls",
      id: sessionId,
      event: "poll_change",
      payload: { type: "activated", poll: toPublicPoll(activatedPoll) },
    }]);
  }

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
