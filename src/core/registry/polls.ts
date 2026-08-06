import type { PollType } from "@/types/database";
import type { PollTypeModule } from "@/core/modules/poll";
import { multiple_choice } from "@/modules/polls/multiple_choice";
import { word_cloud } from "@/modules/polls/word_cloud";
import { emoji_cloud } from "@/modules/polls/emoji_cloud";
import { temperature } from "@/modules/polls/temperature";
import { like_dislike } from "@/modules/polls/like_dislike";
import { planning_poker } from "@/modules/polls/planning_poker";
import { qa } from "@/modules/polls/qa";
import { idea_wall } from "@/modules/polls/idea_wall";

/**
 * Every poll type's module, keyed by type — same discipline as
 * `registry/slides.ts`. `Record<PollType, ...>` rather than
 * `Partial<...>`: adding a 9th poll type without registering it here is a
 * compile error, not a silent gap.
 */
function erase<C, A, L>(m: PollTypeModule<C, A, L>): PollTypeModule<unknown, unknown, unknown> {
  return m as unknown as PollTypeModule<unknown, unknown, unknown>;
}

export const pollRegistry: Record<PollType, PollTypeModule<unknown, unknown, unknown>> = {
  multiple_choice: erase(multiple_choice),
  word_cloud: erase(word_cloud),
  emoji_cloud: erase(emoji_cloud),
  temperature: erase(temperature),
  like_dislike: erase(like_dislike),
  planning_poker: erase(planning_poker),
  qa: erase(qa),
  idea_wall: erase(idea_wall),
};

export function pollModule(type: PollType): PollTypeModule<unknown, unknown, unknown> {
  return pollRegistry[type];
}
