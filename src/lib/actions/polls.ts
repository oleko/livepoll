"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { PollType, OrgPlan } from "@/types/database";
import { getLimits } from "@/lib/limits";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

type PollState = { error: string } | { success: true } | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(s: string) { return UUID_RE.test(s); }

async function realtimeBroadcast(messages: { topic: string; event: string; payload: unknown }[]) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) console.error("[broadcast] failed:", res.status);
  } catch (err) {
    console.error("[broadcast] network error:", (err as Error).message);
  }
}

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
    .select("organization_id, organizations(plan)")
    .eq("id", sessionId)
    .single();

  if (session) {
    const plan = (session.organizations as { plan: OrgPlan } | null)?.plan ?? "free";
    const limits = getLimits(plan);
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
      topic: `session-polls:${sessionId}`,
      event: "poll_change",
      payload: { type: "poll_updated", poll: updated },
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

  const { data: prevActive } = await admin
    .from("polls")
    .select("id, settings")
    .eq("session_id", sessionId)
    .eq("status", "active")
    .maybeSingle();

  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("status", "active");

  const { data: pollForActivation } = await admin
    .from("polls")
    .select("settings")
    .eq("id", pollId)
    .eq("session_id", sessionId)
    .single();

  if (!pollForActivation) return;

  const existingSettings = (pollForActivation?.settings ?? {}) as Record<string, unknown>;
  await admin
    .from("polls")
    .update({ status: "active", settings: { ...existingSettings, activated_at: new Date().toISOString() } })
    .eq("id", pollId);

  const { data: activatedPoll } = await admin
    .from("polls")
    .select("id, title, type, options, status, settings")
    .eq("id", pollId)
    .single();

  type QuizSettings = { quiz_mode?: boolean; correct_option?: string; explanation?: string };

  const messages = [];
  if (prevActive) {
    const prevSettings = prevActive.settings as QuizSettings | null;
    const closePayload: Record<string, unknown> = { type: "closed", poll_id: prevActive.id };
    if (prevSettings?.quiz_mode && prevSettings.correct_option) {
      closePayload.quiz_reveal = {
        correct_option: prevSettings.correct_option,
        ...(prevSettings.explanation ? { explanation: prevSettings.explanation } : {}),
      };
    }
    messages.push({ topic: `session-polls:${sessionId}`, event: "poll_change", payload: closePayload });
  }
  if (activatedPoll) {
    // Strip quiz answers from broadcast so participants cannot cheat
    const broadcastSettings = { ...(activatedPoll.settings as Record<string, unknown> ?? {}) };
    delete broadcastSettings["correct_option"];
    delete broadcastSettings["explanation"];
    messages.push({
      topic: `session-polls:${sessionId}`,
      event: "poll_change",
      payload: { type: "activated", poll: { ...activatedPoll, settings: broadcastSettings } },
    });
  }
  // Clear active slide so display shows poll after refresh too
  await admin.from("sessions").update({ active_slide_id: null } as never).eq("id", sessionId);
  // Also broadcast slide hide so display reacts immediately
  messages.push({ topic: `session-slides:${sessionId}`, event: "slide_change", payload: { type: "hide" } });
  if (messages.length > 0) await realtimeBroadcast(messages);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function closePoll(
  pollId: string,
  sessionId: string,
  orgSlug: string
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

  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", pollId)
    .eq("session_id", sessionId);

  const pollSettings = pollMeta?.settings as { quiz_mode?: boolean; correct_option?: string; explanation?: string } | null;
  const closePayload: Record<string, unknown> = { type: "closed", poll_id: pollId };
  if (pollSettings?.quiz_mode && pollSettings.correct_option) {
    closePayload.quiz_reveal = {
      correct_option: pollSettings.correct_option,
      ...(pollSettings.explanation ? { explanation: pollSettings.explanation } : {}),
    };
  }

  await realtimeBroadcast([{
    topic: `session-polls:${sessionId}`,
    event: "poll_change",
    payload: closePayload,
  }]);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function submitVote(formData: FormData) {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`vote:${ip}`, 30, 60_000)) return { error: "Слишком много запросов. Подождите немного." };

  const admin = createAdminClient();

  const pollId = formData.get("poll_id") as string;
  const voterToken = formData.get("voter_token") as string;
  const value = (formData.get("value") as string)?.trim();

  if (!pollId || !voterToken || !value) return { error: "Неверные данные" };
  if (!isValidUUID(voterToken)) return { error: "Неверные данные" };
  if (value.length > 2000) return { error: "Слишком длинный ответ" };

  // Parse multi-answer JSON arrays
  let parsedValues: string[];
  if (value.startsWith("[")) {
    try {
      parsedValues = JSON.parse(value) as string[];
      if (!Array.isArray(parsedValues) || parsedValues.length === 0 || parsedValues.some((v) => typeof v !== "string" || v.length > 200)) {
        return { error: "Неверные данные" };
      }
    } catch { return { error: "Неверные данные" }; }
  } else {
    if (value.length > 500) return { error: "Слишком длинный ответ" };
    parsedValues = [value];
  }

  const { data: pollData } = await admin
    .from("polls")
    .select("type, settings, session_id")
    .eq("id", pollId)
    .single();

  const settings = pollData?.settings as {
    allow_revote?: boolean;
    vote_limit?: number;
    max_answers?: number;
  } | null;

  const maxAnswers = settings?.max_answers ?? 1;
  if (parsedValues.length > maxAnswers) return { error: `Можно выбрать не более ${maxAnswers} вариантов` };

  const pollType = (pollData as unknown as { type?: string })?.type;
  if (pollType === "word_cloud" && parsedValues.some((v) => v.length > 50)) {
    return { error: "Слишком длинное слово" };
  }

  // Participant limit check: only for new voters entering the session for the first time
  if (pollData?.session_id) {
    const { data: sessionPolls } = await admin
      .from("polls")
      .select("id")
      .eq("session_id", pollData.session_id);
    const sessionPollIds = (sessionPolls ?? []).map((p) => p.id);

    if (sessionPollIds.length > 0) {
      const { data: priorVote } = await admin
        .from("votes")
        .select("id")
        .in("poll_id", sessionPollIds)
        .eq("voter_token", voterToken)
        .limit(1)
        .maybeSingle();

      if (!priorVote) {
        // New voter — check org plan limit
        const { data: sess } = await admin
          .from("sessions")
          .select("organization_id")
          .eq("id", pollData.session_id)
          .single();
        if (sess) {
          const { data: org } = await admin
            .from("organizations")
            .select("plan")
            .eq("id", sess.organization_id)
            .single();
          if (org) {
            const limits = getLimits(org.plan as OrgPlan);
            if (isFinite(limits.maxParticipants)) {
              const { data: tokens } = await admin
                .from("votes")
                .select("voter_token")
                .in("poll_id", sessionPollIds);
              const uniqueCount = new Set((tokens ?? []).map((v) => v.voter_token)).size;
              if (uniqueCount >= limits.maxParticipants) {
                return { error: `Достигнут лимит участников для текущего тарифа (${limits.maxParticipants})` };
              }
            }
          }
        }
      }
    }
  }

  let isRevote = false;

  if (settings?.allow_revote && maxAnswers === 1) {
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
        topic: `poll-votes:${pollId}`,
        event: "revote",
        payload: { old_value: existing.value, new_value: value },
      }]);
      isRevote = true;
    } else {
      const { error } = await admin.from("votes").insert({ poll_id: pollId, voter_token: voterToken, value });
      if (error) return { error: error.message };
      await realtimeBroadcast([{ topic: `poll-votes:${pollId}`, event: "vote", payload: { value, ts: voterToken.slice(0, 6) } }]);
    }
  } else {
    const { error } = await admin.from("votes").insert({ poll_id: pollId, voter_token: voterToken, value });
    if (error?.code === "23505") return { error: "Вы уже проголосовали" };
    if (error) return { error: error.message };
    await realtimeBroadcast([{ topic: `poll-votes:${pollId}`, event: "vote", payload: { value, ts: voterToken.slice(0, 6) } }]);
  }

  // Broadcast unique voter count for this session (skip for revotes — count unchanged)
  if (!isRevote && pollData?.session_id) {
    const { data: sessionPolls } = await admin
      .from("polls")
      .select("id")
      .eq("session_id", pollData.session_id);
    const pollIds = (sessionPolls ?? []).map((p) => p.id);
    if (pollIds.length > 0) {
      const { data: allVoterTokens } = await admin
        .from("votes")
        .select("voter_token")
        .in("poll_id", pollIds);
      const uniqueCount = new Set((allVoterTokens ?? []).map((v) => v.voter_token)).size;
      await realtimeBroadcast([{
        topic: `session-polls:${pollData.session_id}`,
        event: "voter_count",
        payload: { count: uniqueCount },
      }]);
    }
  }

  // Vote limit check — skip for revotes (total count unchanged)
  if (!isRevote) {
    const voteLimit = settings?.vote_limit;
    if (voteLimit && voteLimit > 0 && pollData?.session_id) {
      const { count } = await admin
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("poll_id", pollId);

      if (count !== null && count >= voteLimit) {
        await admin
          .from("polls")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("id", pollId);

        await realtimeBroadcast([{
          topic: `session-polls:${pollData.session_id}`,
          event: "poll_change",
          payload: { type: "closed", poll_id: pollId },
        }]);
      }
    }
  }

  return { success: true };
}

export async function submitQuestion(formData: FormData) {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`question:${ip}`, 15, 60_000)) return { error: "Слишком много запросов. Подождите немного." };

  const admin = createAdminClient();

  const sessionId = formData.get("session_id") as string;
  const pollId = formData.get("poll_id") as string;
  const voterToken = formData.get("voter_token") as string;
  const text = (formData.get("text") as string)?.trim();

  if (!sessionId || !voterToken || !text) return { error: "Неверные данные" };
  if (!isValidUUID(voterToken)) return { error: "Неверные данные" };
  if (text.length > 300) return { error: "Вопрос слишком длинный (максимум 300 символов)" };

  // Check per-voter question limit (idea_wall is exempt — unlimited ideas per voter)
  if (pollId) {
    const { data: pollData } = await admin
      .from("polls")
      .select("settings, type")
      .eq("id", pollId)
      .single();
    if (pollData?.type !== "idea_wall") {
      const maxQ = (pollData?.settings as { max_questions?: number } | null)?.max_questions ?? 1;
      const { count } = await admin
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("voter_token", voterToken);
      if ((count ?? 0) >= maxQ) return { error: "Лимит вопросов исчерпан" };
    }
  }

  const { data, error } = await admin
    .from("questions")
    .insert({ session_id: sessionId, voter_token: voterToken, text })
    .select("id, text, status, upvotes")
    .single();

  if (error) return { error: error.message };

  await realtimeBroadcast([{
    topic: `session-questions:${sessionId}`,
    event: "question_change",
    payload: { type: "new", question: data },
  }]);

  return { success: true };
}

export async function pinQuestion(
  question: { id: string; text: string; status: string; upvotes: number } | null,
  sessionId: string
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await realtimeBroadcast([{
    topic: `session-questions:${sessionId}`,
    event: "question_change",
    payload: { type: "pinned", pinned: question },
  }]);
}

export async function upvoteQuestion(questionId: string, voterToken: string, sessionId: string) {
  const admin = createAdminClient();

  const { error: dupError } = await admin
    .from("question_upvotes")
    .insert({ question_id: questionId, voter_token: voterToken });

  if (dupError?.code === "23505") return { error: "already_upvoted" };
  if (dupError) return { error: dupError.message };

  const { data: current } = await admin
    .from("questions")
    .select("upvotes")
    .eq("id", questionId)
    .single();

  if (!current) return { error: "not_found" };

  const { data: updated } = await admin
    .from("questions")
    .update({ upvotes: current.upvotes + 1 })
    .eq("id", questionId)
    .select("id, text, status, upvotes")
    .single();

  if (updated) {
    await realtimeBroadcast([{
      topic: `session-questions:${sessionId}`,
      event: "question_change",
      payload: { type: "updated", question: updated },
    }]);
  }

  return { success: true };
}

export async function copyPoll(
  pollId: string,
  targetSessionId: string,
  orgSlug: string
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
  });

  revalidatePath(`/org/${orgSlug}/sessions/${targetSessionId}`);
}

export async function deleteQuestion(
  questionId: string,
  sessionId: string,
  orgSlug: string
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await admin.from("questions").delete().eq("id", questionId);

  await realtimeBroadcast([{
    topic: `session-questions:${sessionId}`,
    event: "question_change",
    payload: { type: "updated", question: { id: questionId, status: "hidden" } },
  }]);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function updateQuestionStatus(
  questionId: string,
  status: "pending" | "answered" | "hidden",
  sessionId: string,
  orgSlug: string
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await admin.from("questions").update({ status }).eq("id", questionId);

  const { data: updated } = await admin
    .from("questions")
    .select("id, text, status, upvotes")
    .eq("id", questionId)
    .single();

  if (updated) {
    await realtimeBroadcast([{
      topic: `session-questions:${sessionId}`,
      event: "question_change",
      payload: { type: "updated", question: updated },
    }]);
  }

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
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

  const broadcastSettings = { ...(poll.settings as Record<string, unknown> ?? {}) };
  delete broadcastSettings["correct_option"];
  delete broadcastSettings["explanation"];

  await admin.from("sessions").update({ active_slide_id: null } as never).eq("id", sessionId);

  await realtimeBroadcast([
    { topic: `session-slides:${sessionId}`, event: "slide_change", payload: { type: "hide" } },
    { topic: `session-polls:${sessionId}`, event: "poll_change", payload: { type: "activated", poll: { ...poll, settings: broadcastSettings } } },
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
    topic: `session-polls:${sessionId}`,
    event: "poll_change",
    payload: { type: "display_hidden" },
  }]);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}
