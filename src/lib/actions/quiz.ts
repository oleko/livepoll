"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { computeAndBroadcastLeaderboard } from "@/lib/actions/participants";
import { revalidatePath } from "next/cache";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(s: string) { return UUID_RE.test(s); }

type ChampionshipSettings = {
  enabled: boolean;
  auto: boolean;
  reveal_duration: number;
};

async function broadcast(messages: { topic: string; event: string; payload: unknown }[]) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({ messages }),
  }).catch(() => {});
}

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

// Finds and activates the next draft quiz poll in the session.
// Returns true if a poll was activated, false if none left (championship over).
async function activateNextQuizPollInternal(
  sessionId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<boolean> {
  type PollRow = { id: string; settings: Record<string, unknown> | null; sort_order: number };

  // Close currently active poll if any
  const { data: activePoll } = await admin
    .from("polls")
    .select("id, settings")
    .eq("session_id", sessionId)
    .eq("status", "active")
    .maybeSingle();

  if (activePoll) {
    const existingSettings = (activePoll.settings ?? {}) as Record<string, unknown>;
    await admin
      .from("polls")
      .update({ status: "closed", closed_at: new Date().toISOString(), settings: existingSettings } as never)
      .eq("id", activePoll.id);
  }

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

  if (!nextPoll) return false;

  // Only activate if it's a quiz poll
  const settings = (nextPoll.settings ?? {}) as Record<string, unknown>;
  if (!settings.quiz_mode) {
    // Skip non-quiz polls recursively (shouldn't happen in championship but be safe)
    await admin.from("polls").update({ status: "closed", closed_at: new Date().toISOString() } as never).eq("id", nextPoll.id);
    return activateNextQuizPollInternal(sessionId, admin);
  }

  const updatedSettings = { ...settings, activated_at: new Date().toISOString() };
  await admin
    .from("polls")
    .update({ status: "active", settings: updatedSettings } as never)
    .eq("id", nextPoll.id);

  const { data: activatedPoll } = await admin
    .from("polls")
    .select("id, title, type, options, status, settings")
    .eq("id", nextPoll.id)
    .single();

  await broadcast([{
    topic: `session-polls:${sessionId}`,
    event: "poll_change",
    payload: { type: "activated", poll: activatedPoll },
  }]);

  return true;
}

export async function startChampionship(
  sessionId: string
): Promise<{ error: string } | { success: true }> {
  if (!isValidUUID(sessionId)) return { error: "Некорректный запрос" };
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  // Broadcast lobby close + championship start
  await broadcast([{
    topic: `session-polls:${sessionId}`,
    event: "quiz_start",
    payload: {},
  }]);

  // Activate first quiz poll
  const hasNext = await activateNextQuizPollInternal(sessionId, admin);
  if (!hasNext) return { error: "Нет вопросов для чемпионата" };

  return { success: true };
}

export async function activateNextChampionshipPoll(
  sessionId: string
): Promise<{ error: string } | { success: true; finished: boolean }> {
  if (!isValidUUID(sessionId)) return { error: "Некорректный запрос" };
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const hasNext = await activateNextQuizPollInternal(sessionId, admin);
  if (!hasNext) {
    // Championship finished
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
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({
      messages: [{
        topic: `session-polls:${sessionId}`,
        event: "quiz_finish",
        payload: {},
      }],
    }),
  }).catch(() => {});
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
