import type { OrgPlan } from "@/types/database";

// DB plan values: free → Бесплатный, pro → Стандарт, team → Про
const PLAN_LIMITS: Record<OrgPlan, { sessionsPerMonth: number; pollsPerSession: number; members: number }> = {
  free: { sessionsPerMonth: 3,  pollsPerSession: 5,  members: 1  },
  pro:  { sessionsPerMonth: 5,  pollsPerSession: 15, members: 5  },
  team: { sessionsPerMonth: 20, pollsPerSession: 30, members: 10 },
};

export const PLAN_DISPLAY_NAME: Record<OrgPlan, string> = {
  free: "Бесплатный",
  pro:  "Стандарт",
  team: "Про",
};

export function getLimits(plan: OrgPlan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function formatLimit(value: number): string {
  return value === Infinity ? "без ограничений" : String(value);
}
