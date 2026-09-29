import type { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/core/domain/ids";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * The input-side half of submitVote, kept out of the "use server" module so
 * it can be tested directly: a server-action file may only export async
 * functions, which is why these two lived as unreachable private helpers and
 * the hottest path in the product had no coverage at all.
 */
export type VoteInput = { pollId: string; voterToken: string; value: string; parsedValues: string[] };

export function parseVoteInput(formData: FormData): { error: string } | VoteInput {
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

export type PollVoteSettings = { allow_revote?: boolean; vote_limit?: number; max_answers?: number };
export type LoadedPollForVote = { sessionId: string | null; settings: PollVoteSettings | null; maxAnswers: number };

export async function loadPollForVote(
  admin: Admin,
  pollId: string,
  parsedValues: string[]
): Promise<{ error: string } | LoadedPollForVote> {
  const { data: pollData } = await admin
    .from("polls")
    .select("type, status, settings, session_id")
    .eq("id", pollId)
    .single();

  if (!pollData) return { error: "Опрос не найден" };

  // A participant whose screen missed the `closed` broadcast — the phone was
  // asleep, the socket had dropped — would otherwise still submit, and the
  // vote would land in a poll whose result the host had already shown.
  const pollStatus = (pollData as unknown as { status?: string }).status;
  if (pollStatus !== "active") return { error: "Голосование завершено" };

  const settings = pollData?.settings as PollVoteSettings | null;
  const maxAnswers = settings?.max_answers ?? 1;
  if (parsedValues.length > maxAnswers) return { error: `Можно выбрать не более ${maxAnswers} вариантов` };

  const pollType = (pollData as unknown as { type?: string })?.type;
  if (pollType === "word_cloud" && parsedValues.some((v) => v.length > 50)) {
    return { error: "Слишком длинное слово" };
  }

  return { sessionId: pollData?.session_id ?? null, settings, maxAnswers };
}
