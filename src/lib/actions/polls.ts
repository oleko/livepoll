"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { PollType } from "@/types/database";

type PollState = { error: string } | { success: true } | null;

async function realtimeBroadcast(messages: { topic: string; event: string; payload: unknown }[]) {
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({ messages }),
  }).catch(() => {});
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

  let options: string[] = [];
  if (optionsRaw) {
    options = optionsRaw
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  const { data: last } = await admin
    .from("polls")
    .select("sort_order")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("polls").insert({
    session_id: sessionId,
    created_by: user.id,
    title,
    type,
    options,
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
  const admin = createAdminClient();

  // Закрываем текущий активный опрос и уведомляем
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

  // Активируем новый
  await admin
    .from("polls")
    .update({ status: "active" })
    .eq("id", pollId);

  // Читаем данные активированного опроса для broadcast
  const { data: activatedPoll } = await admin
    .from("polls")
    .select("id, title, type, options, status")
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
  const admin = createAdminClient();
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
  const value = formData.get("value") as string;

  if (!pollId || !voterToken || !value) return { error: "Неверные данные" };

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

  return { success: true };
}

export async function submitQuestion(formData: FormData) {
  const admin = createAdminClient();

  const sessionId = formData.get("session_id") as string;
  const voterToken = formData.get("voter_token") as string;
  const text = (formData.get("text") as string)?.trim();

  if (!sessionId || !voterToken || !text) return { error: "Неверные данные" };
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

export async function updateQuestionStatus(
  questionId: string,
  status: "pending" | "answered" | "hidden",
  sessionId: string,
  orgSlug: string
) {
  const admin = createAdminClient();
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
