import type { OrgPlan } from "@/types/database";

const PLAN_LIMITS: Record<OrgPlan, { sessions: number; participants: number; pollsPerSession: number }> = {
  free:  { sessions: 1,        participants: 50,       pollsPerSession: 5  },
  pro:   { sessions: Infinity, participants: Infinity, pollsPerSession: Infinity },
  team:  { sessions: Infinity, participants: Infinity, pollsPerSession: Infinity },
};

export function getLimits(plan: OrgPlan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function formatLimit(value: number): string {
  return value === Infinity ? "без ограничений" : String(value);
}
