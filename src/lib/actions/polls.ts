"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { PollType } from "@/types/database";
import { getPlanLimits } from "@/core/access/limits";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";
import { isUuid } from "@/core/domain/ids";
import { toPublicPoll } from "@/core/domain/poll";
import { broadcast as realtimeBroadcast, type Message } from "@/core/realtime/broadcast.server";
import { computeAndBroadcastLeaderboard } from "@/lib/actions/participants";
import { closeActivePoll, activateTargetPoll } from "@/server/polls/lifecycle";

type PollState = { error: string } | { success: true } | null;

export async function createPoll(
  _prev: PollState,
  formData: FormData
): Promise<PollState> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const sessionId = formData.get("session_id") as string;
  const orgSlug = formData.get("org_slug") as string;
  const title = (formData.get("title") as string)?.trim();
  const type = formData.get("type") as PollType;
  const optionsRaw = formData.get("options") as string;

  if (!title) return { error: "Введите вопрос" };
  if (!type) return { error: "Выберите тип опроса" };
  if (title.length > 300) return { error: "Вопрос слишком длинный" };

  let options: string[] = [];
  if (optionsRaw) {
    options = optionsRaw.split("\n").map((o) => o.trim()).filter(Boolean);
    if (options.length > 20) return { error: "Максимум 20 вариантов ответа" };
    if (options.some((o) => o.length > 200)) return { error: "Вариант ответа слишком длинный" };
  }

  // Проверяем что пользователь — участник организации, владеющей сессией
  try {
    await assertSessionMember(user.id, sessionId, admin);
  } catch {
    return { error: "Нет доступа к этому мероприятию" };
  }

  // Проверяем лимит опросов по тарифу
  const { data: session } = await admin
    .from("sessions")
    .select("organization_id")
    .eq("id", sessionId)
    .single();

  if (session) {
    const limits = await getPlanLimits(admin, session.organization_id);
    if (limits) {
      const { count } = await admin
        .from("polls")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId);

      if ((count ?? 0) >= limits.pollsPerSession) {
        return {
          error: `Лимит опросов в мероприятии исчерпан (${limits.pollsPerSession}). Перейдите на более высокий тариф.`,
        };
      }
    }
  }

  const { data: last } = await admin
    .from("polls")
    .select("sort_order")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const durationSec = parseInt(formData.get("duration") as string) || 0;
  const voteLimit = parseInt(formData.get("vote_limit") as string) || 0;
  const allowRevote = formData.get("allow_revote") === "on";
  const maxQuestions = parseInt(formData.get("max_questions") as string) || 1;
  const quizMode = formData.get("quiz_mode") === "on";
  const correctOption = (formData.get("correct_option") as string)?.trim() ?? "";
  const explanation = (formData.get("explanation") as string)?.trim() ?? "";
  const settings: Record<string, unknown> = {};
  if (durationSec > 0) settings.duration = durationSec;
  if (voteLimit > 0) settings.vote_limit = voteLimit;
  if (allowRevote) settings.allow_revote = true;
  if (type === "qa" && maxQuestions > 1) settings.max_questions = maxQuestions;
  const maxAnswers = parseInt(formData.get("max_answers") as string) || 1;
  if (type === "multiple_choice" && maxAnswers > 1) settings.max_answers = Math.min(maxAnswers, 10);

  if (quizMode && type === "multiple_choice") {
    if (!correctOption || !options.includes(correctOption)) {
      return { error: "Выберите правильный ответ из списка вариантов" };
    }
    settings.quiz_mode = true;
    settings.correct_option = correctOption;
    if (explanation) settings.explanation = explanation;
  }

  const sectionId = (formData.get("section_id") as string) || null;

  const { error } = await admin.from("polls").insert({
    session_id: sessionId,
    created_by: user.id,
    title,
    type,
    options,
    settings,
    sort_order: (last?.sort_order ?? -1) + 1,
    ...(sectionId ? { section_id: sectionId } : {}),
  });

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { success: true };
}

const EDIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function updatePoll(
  pollId: string,
  title: string,
  options: string[],
  sessionId: string,
  orgSlug: string
): Promise<{ error: string } | { success: true }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  if (!title.trim() || title.length > 300) return { error: "Неверное название" };

  const { data: poll } = await admin
    .from("polls")
    .select("created_at, type")
    .eq("id", pollId)
    .eq("session_id", sessionId)
    .single();

  if (!poll) return { error: "Опрос не найден" };

  const age = Date.now() - new Date(poll.created_at).getTime();
  if (age > EDIT_WINDOW_MS) return { error: "Окно редактирования закрыто (10 минут)" };

  if (poll.type === "multiple_choice" && options.length > 0) {
    await admin.from("polls").update({ title: title.trim(), options } as never).eq("id", pollId);
  } else {
    await admin.from("polls").update({ title: title.trim() }).eq("id", pollId);
  }

  const { data: updated } = await admin
    .from("polls")
    .select("id, title, type, options, status, settings")
    .eq("id", pollId)
    .single();

  if (updated) {
    await realtimeBroadcast([{
      channel: "sessionPolls",
      id: sessionId,
      event: "poll_change",
      payload: { type: "poll_updated", poll: toPublicPoll(updated) },
    }]);
  }

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { success: true };
}

export async function activatePoll(
  pollId: string,
  sessionId: string,
  orgSlug: string
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const prevActive = await closeActivePoll(admin, sessionId);

  const outcome = await activateTargetPoll(admin, sessionId, { kind: "id", pollId });
  if (outcome.status !== "activated") return;
  const activatedPoll = outcome.poll;

  type QuizSettings = { quiz_mode?: boolean; correct_option?: string; explanation?: string };

  const messages: Message[] = [];
  let prevQuizReveal: { correct_option: string; explanation?: string } | undefined;
  if (prevActive) {
    const prevSettings = prevActive.settings as QuizSettings | null;
    prevQuizReveal = prevSettings?.quiz_mode && prevSettings.correct_option
      ? { correct_option: prevSettings.correct_option, ...(prevSettings.explanation ? { explanation: prevSettings.explanation } : {}) }
      : undefined;
    messages.push({
      channel: "sessionPolls",
      id: sessionId,
      event: "poll_change",
      payload: { type: "closed", poll_id: prevActive.id, quiz_reveal: prevQuizReveal },
    });
  }
  messages.push({
    channel: "sessionPolls",
    id: sessionId,
    event: "poll_change",
    payload: { type: "activated", poll: toPublicPoll(activatedPoll) },
  });
  // Clear active slide so display shows poll after refresh too
  await admin.from("sessions").update({ active_slide_id: null } as never).eq("id", sessionId);
  // Also broadcast slide hide so display reacts immediately
  messages.push({ channel: "sessionSlides", id: sessionId, event: "slide_change", payload: { type: "hide" } });
  if (messages.length > 0) await realtimeBroadcast(messages);

  if (prevQuizReveal) {
    await computeAndBroadcastLeaderboard(sessionId, admin);
  }

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function closePoll(
  pollId: string,
  sessionId: string,
  orgSlug: string,
  showResult = false
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const { data: pollMeta } = await admin
    .from("polls")
    .select("settings")
    .eq("id", pollId)
    .eq("session_id", sessionId)
    .single();

  if (!pollMeta) return;

  const pollSettings = pollMeta?.settings as { quiz_mode?: boolean; correct_option?: string; explanation?: string } | null;
  const updatedSettings = { ...(pollMeta?.settings as object ?? {}) };
  if (showResult) Object.assign(updatedSettings, { result_on_display: true });

  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString(), settings: updatedSettings } as never)
    .eq("id", pollId)
    .eq("session_id", sessionId);

  const quizReveal = pollSettings?.quiz_mode && pollSettings.correct_option
    ? { correct_option: pollSettings.correct_option, ...(pollSettings.explanation ? { explanation: pollSettings.explanation } : {}) }
    : undefined;

  await realtimeBroadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "poll_change",
    payload: { type: "closed", poll_id: pollId, quiz_reveal: quizReveal, show_result: showResult || undefined },
  }]);

  if (quizReveal) {
    await computeAndBroadcastLeaderboard(sessionId, admin);
  }

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function clearPollResult(
  pollId: string,
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const { data: pollMeta } = await admin
    .from("polls")
    .select("settings")
    .eq("id", pollId)
    .eq("session_id", sessionId)
    .single();

  const updatedSettings = { ...(pollMeta?.settings as object ?? {}), result_on_display: false };
  await admin.from("polls")
    .update({ settings: updatedSettings } as never)
    .eq("id", pollId)
    .eq("session_id", sessionId);

  await realtimeBroadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "poll_change",
    payload: { type: "display_hidden" },
  }]);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

type VoteInput = { pollId: string; voterToken: string; value: string; parsedValues: string[] };

function parseVoteInput(formData: FormData): { error: string } | VoteInput {
  const pollId = formData.get("poll_id") as string;
  const voterToken = formData.get("voter_token") as string;
  const value = (formData.get("value") as string)?.trim();

  if (!pollId || !voterToken || !value) return { error: "Неверные данные" };
  if (!isUuid(voterToken)) return { error: "Неверные данные" };
  if (value.length > 2000) return { error: "Слишком длинный ответ" };

  // Multi-answer submissions are a JSON array; anything else is a single value.
  if (value.startsWith("[")) {
    let parsedValues: unknown;
    try {
      parsedValues = JSON.parse(value);
    } catch {
      return { error: "Неверные данные" };
    }
    if (!Array.isArray(parsedValues) || parsedValues.length === 0 || parsedValues.some((v) => typeof v !== "string" || v.length > 200)) {
      return { error: "Неверные данные" };
    }
    return { pollId, voterToken, value, parsedValues: parsedValues as string[] };
  }

  if (value.length > 500) return { error: "Слишком длинный ответ" };
  return { pollId, voterToken, value, parsedValues: [value] };
}

type PollVoteSettings = { allow_revote?: boolean; vote_limit?: number; max_answers?: number };
type LoadedPollForVote = { sessionId: string | null; settings: PollVoteSettings | null; maxAnswers: number };

async function loadPollForVote(
  admin: ReturnType<typeof createAdminClient>,
  pollId: string,
  parsedValues: string[]
): Promise<{ error: string } | LoadedPollForVote> {
  const { data: pollData } = await admin
    .from("polls")
    .select("type, settings, session_id")
    .eq("id", pollId)
    .single();

  const settings = pollData?.settings as PollVoteSettings | null;
  const maxAnswers = settings?.max_answers ?? 1;
  if (parsedValues.length > maxAnswers) return { error: `Можно выбрать не более ${maxAnswers} вариантов` };

  const pollType = (pollData as unknown as { type?: string })?.type;
  if (pollType === "word_cloud" && parsedValues.some((v) => v.length > 50)) {
    return { error: "Слишком длинное слово" };
  }

  return { sessionId: pollData?.session_id ?? null, settings, maxAnswers };
}

// Only new voters entering the session for the first time count against
// the plan's participant limit — returning voters (already have a vote on
// any poll in the session) are exempt.
async function checkParticipantLimit(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string,
  voterToken: string
): Promise<{ error: string } | null> {
  const { data: sessionPolls } = await admin
    .from("polls")
    .select("id")
    .eq("session_id", sessionId);
  const sessionPollIds = (sessionPolls ?? []).map((p) => p.id);
  if (sessionPollIds.length === 0) return null;

  const { data: priorVote } = await admin
    .from("votes")
    .select("id")
    .in("poll_id", sessionPollIds)
    .eq("voter_token", voterToken)
    .limit(1)
    .maybeSingle();
  if (priorVote) return null;

  const { data: sess } = await admin
    .from("sessions")
    .select("organization_id")
    .eq("id", sessionId)
    .single();
  if (!sess) return null;

  const limits = await getPlanLimits(admin, sess.organization_id);
  if (!limits || !isFinite(limits.maxParticipants)) return null;

  const { data: tokens } = await admin
    .from("votes")
    .select("voter_token")
    .in("poll_id", sessionPollIds);
  const uniqueCount = new Set((tokens ?? []).map((v) => v.voter_token)).size;
  if (uniqueCount >= limits.maxParticipants) {
    return { error: `Достигнут лимит участников для текущего тарифа (${limits.maxParticipants})` };
  }
  return null;
}

async function recordVote(
  admin: ReturnType<typeof createAdminClient>,
  pollId: string,
  voterToken: string,
  value: string,
  allowRevote: boolean,
  maxAnswers: number
): Promise<{ error: string } | { isRevote: boolean }> {
  if (allowRevote && maxAnswers === 1) {
    const { data: existing } = await admin
      .from("votes")
      .select("value")
      .eq("poll_id", pollId)
      .eq("voter_token", voterToken)
      .maybeSingle();

    if (existing) {
      await admin
        .from("votes")
        .update({ value } as never)
        .eq("poll_id", pollId)
        .eq("voter_token", voterToken);

      await realtimeBroadcast([{
        channel: "pollVotes",
        id: pollId,
        event: "revote",
        payload: { old_value: existing.value, new_value: value },
      }]);
      return { isRevote: true };
    }

    const { error } = await admin.from("votes").insert({ poll_id: pollId, voter_token: voterToken, value });
    if (error) return { error: error.message };
    await realtimeBroadcast([{ channel: "pollVotes", id: pollId, event: "vote", payload: { value, ts: voterToken.slice(0, 6) } }]);
    return { isRevote: false };
  }

  const { error } = await admin.from("votes").insert({ poll_id: pollId, voter_token: voterToken, value });
  if (error?.code === "23505") return { error: "Вы уже проголосовали" };
  if (error) return { error: error.message };
  await realtimeBroadcast([{ channel: "pollVotes", id: pollId, event: "vote", payload: { value, ts: voterToken.slice(0, 6) } }]);
  return { isRevote: false };
}

// Revotes leave the total vote count unchanged, so neither the voter-count
// broadcast nor the vote-limit auto-close applies to them.
async function broadcastVoteEffects(
  admin: ReturnType<typeof createAdminClient>,
  pollId: string,
  sessionId: string,
  isRevote: boolean,
  voteLimit: number | undefined
): Promise<void> {
  if (isRevote) return;

  const { data: sessionPolls } = await admin
    .from("polls")
    .select("id")
    .eq("session_id", sessionId);
  const pollIds = (sessionPolls ?? []).map((p) => p.id);
  if (pollIds.length > 0) {
    const { data: allVoterTokens } = await admin
      .from("votes")
      .select("voter_token")
      .in("poll_id", pollIds);
    const uniqueCount = new Set((allVoterTokens ?? []).map((v) => v.voter_token)).size;
    await realtimeBroadcast([{
      channel: "sessionPolls",
      id: sessionId,
      event: "voter_count",
      payload: { count: uniqueCount },
    }]);
  }

  if (voteLimit && voteLimit > 0) {
    const { count } = await admin
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("poll_id", pollId);

    if (count !== null && count >= voteLimit) {
      await admin
        .from("polls")
        .update({ status: "closed", closed_at: new Date().toISOString() } as never)
        .eq("id", pollId);

      await realtimeBroadcast([{
        channel: "sessionPolls",
        id: sessionId,
        event: "poll_change",
        payload: { type: "closed", poll_id: pollId },
      }]);
    }
  }
}

export async function submitVote(formData: FormData): Promise<{ error: string } | { success: true }> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`vote:${ip}`, 30, 60_000)) return { error: "Слишком много запросов. Подождите немного." };

  const admin = createAdminClient();

  const input = parseVoteInput(formData);
  if ("error" in input) return input;
  const { pollId, voterToken, value, parsedValues } = input;

  const loaded = await loadPollForVote(admin, pollId, parsedValues);
  if ("error" in loaded) return loaded;
  const { sessionId, settings, maxAnswers } = loaded;

  if (sessionId) {
    const limitError = await checkParticipantLimit(admin, sessionId, voterToken);
    if (limitError) return limitError;
  }

  const recorded = await recordVote(admin, pollId, voterToken, value, !!settings?.allow_revote, maxAnswers);
  if ("error" in recorded) return recorded;

  if (sessionId) {
    await broadcastVoteEffects(admin, pollId, sessionId, recorded.isRevote, settings?.vote_limit);
  }

  return { success: true };
}

export async function copyPoll(
  pollId: string,
  targetSessionId: string,
  orgSlug: string,
  targetSectionId?: string | null
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, targetSessionId, admin);

  const { data: poll } = await admin
    .from("polls")
    .select("title, type, options, settings, session_id")
    .eq("id", pollId)
    .single();

  if (!poll) throw new Error("Опрос не найден");

  // Verify source poll belongs to a session the user can access
  await assertSessionMember(user.id, poll.session_id, admin);

  // Strip volatile runtime settings from the copy
  const sourceSettings = (poll.settings ?? {}) as Record<string, unknown>;
  const copiedSettings: Record<string, unknown> = { ...sourceSettings };
  delete copiedSettings["activated_at"];

  const { data: last } = await admin
    .from("polls")
    .select("sort_order")
    .eq("session_id", targetSessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("polls").insert({
    session_id: targetSessionId,
    created_by: user.id,
    title: poll.title,
    type: poll.type,
    options: poll.options,
    settings: copiedSettings,
    sort_order: (last?.sort_order ?? -1) + 1,
    ...(targetSectionId !== undefined ? { section_id: targetSectionId } : {}),
  });

  revalidatePath(`/org/${orgSlug}/sessions/${targetSessionId}`);
}

export async function showPollOnDisplay(
  pollId: string,
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const { data: poll } = await admin
    .from("polls")
    .select("id, title, type, options, status, settings")
    .eq("id", pollId)
    .eq("session_id", sessionId)
    .single();

  if (!poll || poll.status !== "active") return;

  await admin.from("sessions").update({ active_slide_id: null } as never).eq("id", sessionId);

  await realtimeBroadcast([
    { channel: "sessionSlides", id: sessionId, event: "slide_change", payload: { type: "hide" } },
    { channel: "sessionPolls", id: sessionId, event: "poll_change", payload: { type: "activated", poll: toPublicPoll(poll) } },
  ]);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function hidePollFromDisplay(
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await realtimeBroadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "poll_change",
    payload: { type: "display_hidden" },
  }]);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function reorderPolls(
  sessionId: string,
  orderedIds: string[],
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await Promise.all(
    orderedIds.map((id, idx) =>
      admin.from("polls").update({ sort_order: idx }).eq("id", id).eq("session_id", sessionId)
    )
  );

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}
