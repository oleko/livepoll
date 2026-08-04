import type { PublicPoll, QuizReveal } from "@/core/domain/poll";
import type { SlideRef } from "@/core/domain/slide";
import type { LeaderboardEntry } from "@/core/domain/leaderboard";
import type { QuestionRow } from "@/core/domain/question";
import type { ChannelKey } from "./channels";

export type PollChangeEvent =
  | { type: "activated"; poll: PublicPoll }
  | { type: "poll_updated"; poll: PublicPoll }
  | { type: "closed"; poll_id: string; quiz_reveal?: QuizReveal; show_result?: boolean }
  | { type: "display_hidden" };

export type AnnouncementEvent =
  | { clear: true }
  | { text: string; duration: number; started_at: string };

export type SlideChangeEvent =
  | { type: "show"; slide: SlideRef }
  | { type: "hide" };

export type QuestionChangeEvent =
  | { type: "new"; question: QuestionRow }
  | { type: "updated"; question: QuestionRow }
  | { type: "pinned"; pinned: QuestionRow | null };

/** channel -> event name -> payload type. The single source of truth for realtime wire shapes. */
export type EventMap = {
  sessionPolls: {
    poll_change: PollChangeEvent;
    voter_count: { count: number };
    participant_join: { name: string; participants: string[] };
    quiz_start: Record<string, never>;
    quiz_finish: { leaderboard?: LeaderboardEntry[] };
    leaderboard: { leaderboard: LeaderboardEntry[] };
    attendees_update: { total: number };
    pulse: Record<string, never>;
    poker_reveal: Record<string, never>;
    announcement: AnnouncementEvent;
    session_ended: { farewell?: string };
  };
  sessionSlides: {
    slide_change: SlideChangeEvent;
    slide_reveal: { slide_id: string };
    spin_start: { slide_id: string };
  };
  sessionQuestions: {
    question_change: QuestionChangeEvent;
  };
  pollVotes: {
    vote: { value: string; ts?: string };
    revote: { old_value: string; new_value: string };
  };
  sessionBuzz: {
    buzz: { token: string; ts: number };
  };
};

// Compile-time check: every ChannelKey must have a matching EventMap entry.
type _AllChannelsCovered = ChannelKey extends keyof EventMap ? true : never;
const _check: _AllChannelsCovered = true;
void _check;
