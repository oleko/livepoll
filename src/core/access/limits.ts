import type { OrgPlan } from "@/types/database";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const INF = Infinity;

export type PlanLimits = {
  sessionsPerMonth: number;
  pollsPerSession: number;
  members: number;
  maxParticipants: number;
};

const PLAN_LIMITS: Record<OrgPlan, PlanLimits> = {
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

export function getLimits(plan: OrgPlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function formatLimit(value: number): string {
  return value === Infinity ? "без ограничений" : String(value);
}

/**
 * Fetches an org's plan and resolves its limits in one call. Replaces the
 * "select plan from organizations, then getLimits()" 3-line block that used
 * to be repeated (with slightly different join shapes) in createPoll,
 * createSession, duplicateSession, and copySection.
 *
 * Returns null if the org row doesn't exist — callers should skip their
 * limit check in that case, matching what each of those call sites already
 * did before this helper existed.
 */
export async function getPlanLimits(admin: AdminClient, orgId: string): Promise<PlanLimits | null> {
  const { data } = await admin.from("organizations").select("plan").eq("id", orgId).single();
  if (!data) return null;
  return getLimits(data.plan as OrgPlan);
}
