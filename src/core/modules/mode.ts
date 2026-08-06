import type { PollType } from "@/types/database";
import type { SlideType } from "@/core/domain/slide";

export type SessionMode = "conference" | "quiz";

/**
 * What a session mode allows the host to author. Conference: everything.
 * Quiz (championship): a deliberately narrow slice — multiple_choice polls
 * (quiz_mode required) plus reveal/splash/announcement slides for pacing
 * between rounds. No Q&A, no idea_wall, no sections — those are conference
 * concepts that don't compose with the lobby → round → leaderboard flow.
 */
export type ModeCapabilities = {
  pollTypes: readonly PollType[] | "all";
  slideTypes: readonly SlideType[] | "all";
  qa: boolean;
  sections: boolean;
  requiresIdentity: boolean;
  hasLeaderboard: boolean;
};

export interface SessionModeModule {
  readonly id: SessionMode;
  readonly capabilities: ModeCapabilities;
}
