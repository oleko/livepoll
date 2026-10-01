"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { revalidatePath } from "next/cache";
import { limitPerVoter } from "@/server/rateLimitKeys";
import { isUuid } from "@/core/domain/ids";
import { voteError, type VoteError } from "@/core/domain/voteErrors";
import { broadcast as realtimeBroadcast } from "@/core/realtime/broadcast.server";
import type { QuestionRow } from "@/core/domain/question";

export async function submitQuestion(formData: FormData): Promise<VoteError | { success: true }> {
  const admin = createAdminClient();

  const sessionId = formData.get("session_id") as string;
  const pollId = formData.get("poll_id") as string;
  const voterToken = formData.get("voter_token") as string;

  // Was keyed on IP alone, so one shared venue connection capped the whole
  // room at 15 questions a minute between them.
  const rate = await limitPerVoter("question", voterToken, 8, 300);
  if (!rate.ok) return voteError(rate.code, rate.error);
  const text = (formData.get("text") as string)?.trim();

  if (!sessionId || !voterToken || !text) return voteError("invalid", "Неверные данные");
  if (!isUuid(voterToken)) return voteError("invalid", "Неверные данные");
  if (text.length > 300) return voteError("invalid", "Вопрос слишком длинный (максимум 300 символов)");

  // Check per-voter question limit (idea_wall is exempt — unlimited ideas per voter)
  if (pollId) {
    const { data: pollData } = await admin
      .from("polls")
      .select("settings, type, status")
      .eq("id", pollId)
      .single();
    if (!pollData) return voteError("not_found", "Опрос не найден");
    // Same gap submitVote had: a phone that missed the close broadcast could
    // keep adding questions to a poll the host had already finished with.
    if ((pollData as unknown as { status?: string }).status !== "active") {
      return voteError("closed", "Приём вопросов завершён");
    }
    if (pollData?.type !== "idea_wall") {
      const maxQ = (pollData?.settings as { max_questions?: number } | null)?.max_questions ?? 1;
      const { count } = await admin
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("voter_token", voterToken);
      if ((count ?? 0) >= maxQ) return voteError("question_limit", "Лимит вопросов исчерпан");
    }
  }

  const { data, error } = await admin
    .from("questions")
    .insert({ session_id: sessionId, voter_token: voterToken, text, ...(pollId ? { poll_id: pollId } : {}) })
    .select("id, text, status, upvotes, poll_id")
    .single();

  if (error) {
    console.error("[submitQuestion]", error.code, error.message);
    return voteError("failed", "Не удалось отправить");
  }

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
  // Had no authentication and no limit at all: anyone could drive a question
  // up the Q&A list as fast as requests would go through.
  if (!isUuid(voterToken)) return { error: "Некорректный запрос" };
  const rate = await limitPerVoter("upvote", voterToken, 30, 600);
  if (!rate.ok) return { error: rate.error };

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
