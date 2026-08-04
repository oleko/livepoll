import { z } from "zod";

/**
 * The canonical shape of `polls.settings` jsonb. Previously re-declared ad
 * hoc — with slightly different subsets of fields — in DisplayScreen,
 * VoteInterface, the session page, quiz.ts, and participants.ts.
 *
 * `.passthrough()` because this is a read-side schema: it documents and
 * validates the fields the app currently knows about without rejecting
 * settings a poll module might add later. Authoring (createPoll's FormData
 * parsing) is not routed through this yet — that lands with the per-type
 * poll modules in a later phase, since the shape there is genuinely
 * per-type, not a single flat schema.
 */
export const PollSettings = z.object({
  duration: z.number().int().positive().optional(),
  activated_at: z.string().optional(),
  vote_limit: z.number().int().positive().optional(),
  allow_revote: z.boolean().optional(),
  max_questions: z.number().int().positive().optional(),
  max_answers: z.number().int().positive().optional(),
  quiz_mode: z.boolean().optional(),
  correct_option: z.string().optional(),
  explanation: z.string().optional(),
  result_on_display: z.boolean().optional(),
}).passthrough();

export type PollSettings = z.infer<typeof PollSettings>;
export type PublicPollSettings = Omit<PollSettings, "correct_option" | "explanation">;

/** Parses a `settings` jsonb value with defaults; never throws on unrecognized shapes. */
export function parsePollSettings(settings: unknown): PollSettings {
  const result = PollSettings.safeParse(settings ?? {});
  return result.success ? result.data : {};
}
