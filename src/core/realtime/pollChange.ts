import type { PollChangeEvent } from "./events";
import type { PublicPoll, QuizReveal } from "@/core/domain/poll";

/**
 * What a `poll_change` broadcast means, decided in one place.
 *
 * The wire event is a four-way union whose `closed` case carries two optional
 * flags, and each of the three live screens (DisplayScreen, VoteInterface,
 * PresenterScreen) unpacked it independently. The copies had already drifted:
 * `display_hidden` was handled on one screen only, and `poll_updated` merged
 * the full poll in one place and just title+options in another, so an edit
 * made mid-event reached the projector and the phones differently.
 *
 * Screens still decide what to DO with an action — the participant's voting UI
 * disappears when a poll closes while the projector keeps showing results, and
 * that difference is deliberate. What they no longer each decide is what the
 * event *was*.
 */
export type PollChangeAction =
  | { kind: "activated"; poll: PublicPoll }
  | { kind: "updated"; poll: PublicPoll }
  | { kind: "closed"; pollId: string; quizReveal: QuizReveal | null; showResult: boolean }
  | { kind: "hidden" };

export function classifyPollChange(event: PollChangeEvent): PollChangeAction {
  switch (event.type) {
    case "activated":
      return { kind: "activated", poll: event.poll };
    case "poll_updated":
      return { kind: "updated", poll: event.poll };
    case "closed":
      return {
        kind: "closed",
        pollId: event.poll_id,
        quizReveal: event.quiz_reveal ?? null,
        // A quiz reveal is its own thing: the answer is shown, not the plain
        // result panel, so show_result is not implied by it.
        showResult: event.show_result === true,
      };
    case "display_hidden":
      return { kind: "hidden" };
  }
}
