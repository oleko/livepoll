"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { PollType, OrgPlan } from "@/types/database";
import { getLimits } from "@/lib/limits";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";

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
  const settings: Record<string, unknown> = {};
  if (durationSec > 0) settings.duration = durationSec;
  if (voteLimit > 0) settings.vote_limit = voteLimit;

  const { error } = await admin.from("polls").insert({
    session_id: sessionId,
    created_by: user.id,
    title,
    type,
    options,
    settings,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  if (error) return { error: error.message };

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
    .select("id")
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
    .single();

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

  const messages = [];
  if (prevActive) {
    messages.push({
      topic: `session-polls:${sessionId}`,
      event: "poll_change",
      payload: { type: "closed", poll_id: prevActive.id },
    });
  }
  if (activatedPoll) {
    messages.push({
      topic: `session-polls:${sessionId}`,
      event: "poll_change",
      payload: { type: "activated", poll: activatedPoll },
    });
  }
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

  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", pollId);

  await realtimeBroadcast([{
    topic: `session-polls:${sessionId}`,
    event: "poll_change",
    payload: { type: "closed", poll_id: pollId },
  }]);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function submitVote(formData: FormData) {
  const admin = createAdminClient();

  const pollId = formData.get("poll_id") as string;
  const voterToken = formData.get("voter_token") as string;
  const value = (formData.get("value") as string)?.trim();

  if (!pollId || !voterToken || !value) return { error: "Неверные данные" };
  if (!isValidUUID(voterToken)) return { error: "Неверные данные" };
  if (value.length > 500) return { error: "Слишком длинный ответ" };

  const { error } = await admin.from("votes").insert({
    poll_id: pollId,
    voter_token: voterToken,
    value,
  });

  if (error?.code === "23505") return { error: "Вы уже проголосовали" };
  if (error) return { error: error.message };

  await realtimeBroadcast([{
    topic: `poll-votes:${pollId}`,
    event: "vote",
    payload: { value },
  }]);

  const { data: pollData } = await admin
    .from("polls")
    .select("settings, session_id")
    .eq("id", pollId)
    .single();

  const voteLimit = (pollData?.settings as { vote_limit?: number } | null)?.vote_limit;
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

  return { success: true };
}

export async function submitQuestion(formData: FormData) {
  const admin = createAdminClient();

  const sessionId = formData.get("session_id") as string;
  const voterToken = formData.get("voter_token") as string;
  const text = (formData.get("text") as string)?.trim();

  if (!sessionId || !voterToken || !text) return { error: "Неверные данные" };
  if (!isValidUUID(voterToken)) return { error: "Неверные данные" };
  if (text.length > 300) return { error: "Вопрос слишком длинный" };

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
