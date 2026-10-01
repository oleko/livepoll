import type { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/core/domain/ids";
import { isPollExpired } from "@/core/domain/pollTiming";
import { voteError, type VoteError } from "@/core/domain/voteErrors";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * The input-side half of submitVote, kept out of the "use server" module so
 * it can be tested directly: a server-action file may only export async
 * functions, which is why these two lived as unreachable private helpers and
 * the hottest path in the product had no coverage at all.
 */
export type VoteInput = { pollId: string; voterToken: string; value: string; parsedValues: string[] };

export function parseVoteInput(formData: FormData): VoteError | VoteInput {
  const pollId = formData.get("poll_id") as string;
  const voterToken = formData.get("voter_token") as string;
  const value = (formData.get("value") as string)?.trim();

  if (!pollId || !voterToken || !value) return voteError("invalid", "Неверные данные");
  if (!isUuid(voterToken)) return voteError("invalid", "Неверные данные");
  if (value.length > 2000) return voteError("invalid", "Слишком длинный ответ");

  // Multi-answer submissions are a JSON array; anything else is a single value.
  if (value.startsWith("[")) {
    let parsedValues: unknown;
    try {
      parsedValues = JSON.parse(value);
    } catch {
      return voteError("invalid", "Неверные данные");
    }
    if (!Array.isArray(parsedValues) || parsedValues.length === 0 || parsedValues.some((v) => typeof v !== "string" || v.length > 200)) {
      return voteError("invalid", "Неверные данные");
    }
    return { pollId, voterToken, value, parsedValues: parsedValues as string[] };
  }

  if (value.length > 500) return voteError("invalid", "Слишком длинный ответ");
  return { pollId, voterToken, value, parsedValues: [value] };
}

export type PollVoteSettings = {
  allow_revote?: boolean;
  vote_limit?: number;
  max_answers?: number;
  duration?: number;
  activated_at?: string;
};
export type LoadedPollForVote = { sessionId: string | null; settings: PollVoteSettings | null; maxAnswers: number };
/** `expired` tells submitVote to close the poll, not just refuse the vote. */
export type VoteRejection = VoteError & { expired?: true };

export async function loadPollForVote(
  admin: Admin,
  pollId: string,
  parsedValues: string[]
): Promise<VoteRejection | LoadedPollForVote> {
  const { data: pollData } = await admin
    .from("polls")
    .select("type, status, settings, session_id")
    .eq("id", pollId)
    .single();

  if (!pollData) return voteError("not_found", "Опрос не найден");

  // A participant whose screen missed the `closed` broadcast — the phone was
  // asleep, the socket had dropped — would otherwise still submit, and the
  // vote would land in a poll whose result the host had already shown.
  const pollStatus = (pollData as unknown as { status?: string }).status;
  if (pollStatus !== "active") return voteError("closed", "Голосование завершено");

  const settings = pollData?.settings as PollVoteSettings | null;

  // Still flagged "active" but its time is up — the projector, which used to
  // be the only thing that closed timed polls, is closed or asleep.
  if (isPollExpired(settings)) return { ...voteError("expired", "Время вышло"), expired: true as const };

  const maxAnswers = settings?.max_answers ?? 1;
  if (parsedValues.length > maxAnswers) return voteError("too_many_answers", `Можно выбрать не более ${maxAnswers} вариантов`);

  const pollType = (pollData as unknown as { type?: string })?.type;
  if (pollType === "word_cloud" && parsedValues.some((v) => v.length > 50)) {
    return voteError("invalid", "Слишком длинное слово");
  }

  return { sessionId: pollData?.session_id ?? null, settings, maxAnswers };
}
