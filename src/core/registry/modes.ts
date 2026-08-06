import type { SessionMode, SessionModeModule } from "@/core/modules/mode";
import { conference } from "@/modules/modes/conference";
import { quiz } from "@/modules/modes/quiz";

export const modeRegistry: Record<SessionMode, SessionModeModule> = {
  conference,
  quiz,
};

export function modeModule(mode: SessionMode): SessionModeModule {
  return modeRegistry[mode];
}
