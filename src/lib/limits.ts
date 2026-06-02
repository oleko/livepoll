import type { OrgPlan } from "@/types/database";

const INF = Infinity;

const PLAN_LIMITS: Record<OrgPlan, {
  sessionsPerMonth: number;
  pollsPerSession: number;
  members: number;
  maxParticipants: number;
}> = {
  free:      { sessionsPerMonth: 3,   pollsPerSession: 5,   members: 1,   maxParticipants: 30   },
  starter:   { sessionsPerMonth: INF, pollsPerSession: 10,  members: 1,   maxParticipants: 100  },
  pro:       { sessionsPerMonth: INF, pollsPerSession: INF, members: 1,   maxParticipants: 500  },
  team:      { sessionsPerMonth: INF, pollsPerSession: INF, members: 5,   maxParticipants: INF  },
  unlimited: { sessionsPerMonth: INF, pollsPerSession: INF, members: INF, maxParticipants: INF  },
};

export const PLAN_DISPLAY_NAME: Record<OrgPlan, string> = {
  free:      "Бесплатный",
  starter:   "Старт",
  pro:       "Про",
  team:      "Команда",
  unlimited: "Безлимитный",
};

export function getLimits(plan: OrgPlan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function formatLimit(value: number): string {
  return value === Infinity ? "без ограничений" : String(value);
}