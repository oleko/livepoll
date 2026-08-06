import type { SessionModeModule } from "@/core/modules/mode";

/**
 * Championship. A narrow slice deliberately: multiple_choice (quiz_mode)
 * polls paced by reveal/splash/announcement slides between rounds. No Q&A,
 * idea_wall or sections — those don't compose with the lobby → round →
 * leaderboard flow this mode drives.
 */
export const quiz: SessionModeModule = {
  id: "quiz",
  capabilities: {
    pollTypes: ["multiple_choice"],
    slideTypes: ["reveal", "splash", "announcement"],
    qa: false,
    sections: false,
    requiresIdentity: true,
    hasLeaderboard: true,
  },
};
