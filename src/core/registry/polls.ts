import type { PollType } from "@/types/database";
import type { PollTypeModule } from "@/core/modules/poll";
import { multiple_choice } from "@/modules/polls/multiple_choice";
import { word_cloud } from "@/modules/polls/word_cloud";

/**
 * Poll type modules, keyed by type — same discipline as `registry/slides.ts`.
 * `Partial<Record<...>>` for now: Phase 3 lands one type per increment
 * (multiple_choice first, since it validates the contract), each an
 * independent release. Sites consult `pollModule()` and fall back to the
 * pre-migration inline branch for any type that returns `undefined`. Once
 * all 8 types are migrated, this tightens to `Record<PollType, ...>` (no
 * `Partial`) to force future additions through the registry, matching
 * `registry/slides.ts`.
 */
function erase<C, A, L>(m: PollTypeModule<C, A, L>): PollTypeModule<unknown, unknown, unknown> {
  return m as unknown as PollTypeModule<unknown, unknown, unknown>;
}

export const pollRegistry: Partial<Record<PollType, PollTypeModule<unknown, unknown, unknown>>> = {
  multiple_choice: erase(multiple_choice),
  word_cloud: erase(word_cloud),
};

export function pollModule(type: PollType): PollTypeModule<unknown, unknown, unknown> | undefined {
  return pollRegistry[type];
}
