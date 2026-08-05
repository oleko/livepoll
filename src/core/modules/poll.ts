import type { PollType } from "@/types/database";
import type { QuizReveal } from "@/core/domain/poll";
import type { Translator } from "@/core/settings/field";
import type { Aggregate } from "@/core/votes/aggregate";

/**
 * Identifying/ambient info handed to every poll type's `useDisplayLive`,
 * regardless of whether that type cares about any of it — same shape for
 * all types keeps the registry's erasure boundary sound. `quizReveal` stays
 * here (not owned by a per-module subscription) because it is a session-mode
 * concern today (championship scoring reads it too, in DisplayScreen), not a
 * poll-type concern; Phase 4 is expected to relocate it once modes exist.
 */
export type PollLiveCtx = {
  sessionId: string | null;
  pollId: string;
  quizReveal: QuizReveal | null;
};

export type PollParticipantProps<Config> = {
  config: Config;
  disabled: boolean;
  onVote: (value: string) => void;
  t: Translator;
};

export type PollDisplayProps<Config, Agg, Live> = {
  config: Config;
  agg: Agg;
  live: Live;
  accent: string;
  isDark: boolean;
};

export type PollHostResultProps<Config, Agg> = {
  config: Config;
  agg: Agg;
  total: number;
  t: Translator;
};

export type PollPresenterProps<Config, Agg> = {
  config: Config;
  agg: Agg;
  total: number;
};

/**
 * Everything the app needs to know about one poll type. A module fully
 * describes: how to read its settings (config.fromSettings), how to tally
 * raw votes (aggregate), what participants see before responding
 * (render.participant), what the projector shows (render.display +
 * optional useDisplayLive for module-owned realtime/derived state), the
 * compact host-side summary (render.hostResult), and the presenter-screen
 * summary (render.presenter — optional, falls back to nothing rendered).
 */
export interface PollTypeModule<Config = unknown, Agg = unknown, Live = void> {
  readonly id: PollType;
  readonly meta: { icon: string; labelKey: string; order: number };

  readonly config: {
    fromSettings(poll: { options: unknown; settings: unknown }): Config;
  };

  readonly aggregate: (votes: { value: string }[], config: Config, opts?: { sortByPopularity?: boolean }) => Agg;

  /** Module-owned realtime/derived state for the projector. `undefined` if omitted. */
  readonly useDisplayLive?: (ctx: PollLiveCtx) => Live;

  readonly render: {
    participant: React.ComponentType<PollParticipantProps<Config>>;
    display: React.ComponentType<PollDisplayProps<Config, Agg, Live>>;
    hostResult: React.ComponentType<PollHostResultProps<Config, Agg>>;
    presenter?: React.ComponentType<PollPresenterProps<Config, Agg>>;
  };
}

/** Convenience alias — most modules tally with the shared `core/votes/aggregate` primitive. */
export type PollAggregate = Aggregate;
