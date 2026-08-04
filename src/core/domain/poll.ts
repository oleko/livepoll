import type { PollType } from "@/types/database";

export type QuizReveal = { correct_option: string; explanation?: string };

declare const PUBLIC_POLL: unique symbol;

/**
 * The poll shape that is safe to send to participants and the projector.
 * The only way to produce one is `toPublicPoll()`, which strips quiz answers.
 * The brand makes it a compile error to broadcast a raw DB row in its place.
 */
export type PublicPoll = {
  id: string;
  title: string;
  type: PollType;
  options: unknown[];
  status: string;
  settings: Record<string, unknown>;
} & { readonly [PUBLIC_POLL]: true };

export type RawPollRow = {
  id: string;
  title: string;
  type: PollType;
  options: unknown[];
  status: string;
  settings?: Record<string, unknown> | null;
};

/** The only constructor for PublicPoll. Strips correct_option/explanation, then brands. */
export function toPublicPoll(row: RawPollRow): PublicPoll {
  const settings = { ...(row.settings ?? {}) };
  delete settings["correct_option"];
  delete settings["explanation"];
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    options: row.options,
    status: row.status,
    settings,
  } as PublicPoll;
}
