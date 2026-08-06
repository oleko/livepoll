"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";
import { isUuid } from "@/core/domain/ids";
import { broadcast as realtimeBroadcast } from "@/core/realtime/broadcast.server";
import type { QuestionRow } from "@/core/domain/question";

export async function submitQuestion(formData: FormData) {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`question:${ip}`, 15, 60_000)) return { error: "Слишком много запросов. Подождите немного." };

  const admin = createAdminClient();

  const sessionId = formData.get("session_id") as string;
  const pollId = formData.get("poll_id") as string;
  const voterToken = formData.get("voter_token") as string;
  const text = (formData.get("text") as string)?.trim();

  if (!sessionId || !voterToken || !text) return { error: "Неверные данные" };
  if (!isUuid(voterToken)) return { error: "Неверные данные" };
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
    .insert({ session_id: sessionId, voter_token: voterToken, text, ...(pollId ? { poll_id: pollId } : {}) })
    .select("id, text, status, upvotes, poll_id")
    .single();

  if (error) return { error: error.message };

  await realtimeBroadcast([{
    channel: "sessionQuestions",
    id: sessionId,
    event: "question_change",
    payload: { type: "new", question: data },
  }]);

  return { success: true };
}

export async function pinQuestion(
  question: QuestionRow | null,
  sessionId: string
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await realtimeBroadcast([{
    channel: "sessionQuestions",
    id: sessionId,
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

  const { data: updated, error: rpcError } = await admin.rpc("increment_question_upvotes", {
    p_question_id: questionId,
  });

  if (rpcError || !updated) return { error: rpcError?.message ?? "not_found" };

  await realtimeBroadcast([{
    channel: "sessionQuestions",
    id: sessionId,
    event: "question_change",
    payload: { type: "updated", question: updated },
  }]);

  return { success: true };
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
    channel: "sessionQuestions",
    id: sessionId,
    event: "question_change",
    payload: { type: "updated", question: { id: questionId, text: "", status: "hidden", upvotes: 0 } },
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
      channel: "sessionQuestions",
      id: sessionId,
      event: "question_change",
      payload: { type: "updated", question: updated },
    }]);
  }

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}
