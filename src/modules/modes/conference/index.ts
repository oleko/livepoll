import type { SessionModeModule } from "@/core/modules/mode";

/** The default mode. Everything is available — no gating, no overlays. */
export const conference: SessionModeModule = {
  id: "conference",
  capabilities: {
    pollTypes: "all",
    slideTypes: "all",
    qa: true,
    sections: true,
    requiresIdentity: false,
    hasLeaderboard: false,
  },
};
