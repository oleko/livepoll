import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_DISPLAY_NAME, getLimits } from "@/lib/limits";
import { OrgPlanForm } from "./OrgPlanForm";
import { DeleteOrgButton } from "./DeleteOrgButton";
import type { OrgPlan } from "@/types/database";

export default async function AdminOrgsPage() {
  const admin = createAdminClient();

  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, slug, plan, plan_expires_at, created_at")
    .order("created_at", { ascending: false });

  const orgIds = orgs?.map((o) => o.id) ?? [];

  const { data: memberCounts } = await admin
    .from("organization_members")
    .select("organization_id")
    .in("organization_id", orgIds);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: sessionCounts } = await admin
    .from("sessions")
    .select("organization_id")
    .in("organization_id", orgIds);

  const { data: sessionCountsMonth } = await admin
    .from("sessions")
    .select("organization_id")
    .in("organization_id", orgIds)
    .gte("created_at", monthStart.toISOString());

  const membersBy = (memberCounts ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.organization_id] = (acc[m.organization_id] ?? 0) + 1;
    return acc;
  }, {});

  const sessionsBy = (sessionCounts ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.organization_id] = (acc[s.organization_id] ?? 0) + 1;
    return acc;
  }, {});

  const sessionsMonthBy = (sessionCountsMonth ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.organization_id] = (acc[s.organization_id] ?? 0) + 1;
    return acc;
  }, {});

  const PLAN_COLOR: Record<OrgPlan, string> = {
    free:      "text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800",
    starter:   "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/40",
    pro:       "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40",
    team:      "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
    unlimited: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/40",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Организации</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{orgs?.length ?? 0} всего</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Организация</th>
              <th className="text-left px-5 py-3 font-medium">Тариф / до</th>
              <th className="text-left px-5 py-3 font-medium">Мер. в месяц</th>
              <th className="text-left px-5 py-3 font-medium">Участники</th>
              <th className="text-left px-5 py-3 font-medium">Всего мер.</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(orgs ?? []).map((org) => (
              <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900 dark:text-white">{org.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{org.slug}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOR[org.plan as OrgPlan]}`}>
                    {PLAN_DISPLAY_NAME[org.plan as OrgPlan]}
                  </span>
                  {org.plan_expires_at && (
                    <p className={`text-xs mt-0.5 ${new Date(org.plan_expires_at) < new Date() ? "text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
                      до {new Date(org.plan_expires_at).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  {(() => {
                    const limits = getLimits(org.plan as OrgPlan);
                    const used = sessionsMonthBy[org.id] ?? 0;
                    const isOver = used >= limits.sessionsPerMonth;
                    return (
                      <div>
                        <span className={`text-sm font-medium ${isOver ? "text-red-500" : "text-slate-700 dark:text-slate-300"}`}>
                          {used} / {limits.sessionsPerMonth}
                        </span>
                        <div className="mt-1 h-1 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isOver ? "bg-red-500" : "bg-indigo-500"}`}
                            style={{ width: `${Math.min(Math.round((used / limits.sessionsPerMonth) * 100), 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-5 py-4">
                  {(() => {
                    const limits = getLimits(org.plan as OrgPlan);
                    const used = membersBy[org.id] ?? 0;
                    const isOver = used >= limits.members;
                    return (
                      <span className={`text-sm ${isOver ? "text-red-500 font-medium" : "text-slate-600 dark:text-slate-300"}`}>
                        {used} / {limits.members}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  {sessionsBy[org.id] ?? 0}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <OrgPlanForm
                      orgId={org.id}
                      currentPlan={org.plan as OrgPlan}
                      currentExpires={org.plan_expires_at}
                    />
                    <DeleteOrgButton orgId={org.id} name={org.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!orgs || orgs.length === 0) && (
          <div className="py-16 text-center text-slate-400 dark:text-slate-600">
            Нет организаций
          </div>
        )}
      </div>
    </div>
  );
}
