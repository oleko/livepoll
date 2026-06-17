import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations, getLocale } from "next-intl/server";
import { PLAN_DISPLAY_NAME } from "@/lib/limits";
import type { OrgPlan } from "@/types/database";

export const metadata = { title: "Stats — Admin" };

const PLAN_COLOR: Record<OrgPlan, string> = {
  free:      "bg-slate-400 dark:bg-slate-600",
  starter:   "bg-sky-500",
  pro:       "bg-indigo-500",
  team:      "bg-amber-500",
  unlimited: "bg-violet-500",
};

const PLAN_TEXT: Record<OrgPlan, string> = {
  free:      "text-slate-500 dark:text-slate-400",
  starter:   "text-sky-600 dark:text-sky-400",
  pro:       "text-indigo-600 dark:text-indigo-400",
  team:      "text-amber-600 dark:text-amber-400",
  unlimited: "text-violet-600 dark:text-violet-400",
};

function weekStart(weeksAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(weeksAgo: number, dateLocale: string): string {
  const d = weekStart(weeksAgo);
  return d.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
}

function bucketByWeek(rows: { created_at: string }[], weeks: number): number[] {
  const counts = Array(weeks).fill(0);
  for (const row of rows) {
    const ts = new Date(row.created_at).getTime();
    for (let w = 0; w < weeks; w++) {
      const start = weekStart(weeks - 1 - w).getTime();
      const end = weekStart(weeks - 2 - w).getTime();
      if (ts >= start && (w === weeks - 1 || ts < end)) {
        counts[w]++;
        break;
      }
    }
  }
  return counts;
}

export default async function AdminStatsPage() {
  const admin = createAdminClient();
  const t = await getTranslations("Admin.stats");
  const locale = await getLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const eightWeeksAgo = weekStart(8);

  const [
    { count: totalOrgs },
    { count: newOrgsMonth },
    { count: totalUsers },
    { count: totalSessions },
    { count: activeSessions },
    { count: totalVotes },
    { data: allOrgs },
    { data: recentOrgs },
    { data: recentSessions },
    { data: allSessions },
  ] = await Promise.all([
    admin.from("organizations").select("*", { count: "exact", head: true }),
    admin.from("organizations").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("sessions").select("*", { count: "exact", head: true }),
    admin.from("sessions").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("votes").select("*", { count: "exact", head: true }),
    admin.from("organizations").select("id, name, plan, slug"),
    admin.from("organizations").select("id, created_at").gte("created_at", eightWeeksAgo.toISOString()),
    admin.from("sessions").select("id, organization_id, created_at").gte("created_at", eightWeeksAgo.toISOString()),
    admin.from("sessions").select("id, organization_id"),
  ]);

  // Plan distribution
  const planCounts: Record<string, number> = {};
  for (const org of allOrgs ?? []) {
    planCounts[org.plan] = (planCounts[org.plan] ?? 0) + 1;
  }
  const plans: OrgPlan[] = ["free", "starter", "pro", "team", "unlimited"];

  // Weekly growth (8 weeks)
  const WEEKS = 8;
  const orgWeekly = bucketByWeek(recentOrgs ?? [], WEEKS);
  const sessionWeekly = bucketByWeek(recentSessions ?? [], WEEKS);
  const orgMax = Math.max(...orgWeekly, 1);
  const sessionMax = Math.max(...sessionWeekly, 1);

  // Top orgs by sessions + votes
  const { data: allPolls } = await admin.from("polls").select("id, session_id");

  const sessionToOrg = (allSessions ?? []).reduce<Record<string, string>>((acc, s) => {
    acc[s.id] = s.organization_id;
    return acc;
  }, {});

  const pollToSession = (allPolls ?? []).reduce<Record<string, string>>((acc, p) => {
    acc[p.id] = p.session_id;
    return acc;
  }, {});

  const orgStats: Record<string, { sessions: number; votes: number }> = {};
  for (const org of allOrgs ?? []) {
    orgStats[org.id] = { sessions: 0, votes: 0 };
  }
  for (const s of allSessions ?? []) {
    if (orgStats[s.organization_id]) orgStats[s.organization_id].sessions++;
  }

  const { data: voteCounts } = await admin.from("votes").select("poll_id");

  for (const v of voteCounts ?? []) {
    const sessionId = pollToSession[v.poll_id];
    if (!sessionId) continue;
    const orgId = sessionToOrg[sessionId];
    if (!orgId || !orgStats[orgId]) continue;
    orgStats[orgId].votes++;
  }

  const topOrgs = (allOrgs ?? [])
    .map((org) => ({ ...org, ...orgStats[org.id] }))
    .sort((a, b) => b.votes - a.votes || b.sessions - a.sessions)
    .slice(0, 10);

  const metrics = [
    { label: t("metricOrgs"),    value: totalOrgs ?? 0,     sub: t("metricOrgsSub", { count: newOrgsMonth ?? 0 }), color: "text-indigo-600 dark:text-indigo-400" },
    { label: t("metricUsers"),   value: totalUsers ?? 0,    sub: null, color: "text-slate-900 dark:text-white" },
    { label: t("metricSessions"),value: totalSessions ?? 0, sub: null, color: "text-slate-900 dark:text-white" },
    { label: t("metricActive"),  value: activeSessions ?? 0,sub: t("metricActiveSub"), color: activeSessions ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-600" },
    { label: t("metricVotes"),   value: totalVotes ?? 0,    sub: null, color: "text-slate-900 dark:text-white" },
    { label: t("metricFree"),    value: planCounts["free"] ?? 0, sub: t("metricFreeSub", { total: totalOrgs ?? 0 }), color: "text-slate-500 dark:text-slate-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{t("subtitle")}</p>
      </div>

      {/* ── Key metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{m.label}</p>
            <p className={`text-3xl font-bold tabular-nums leading-none ${m.color}`}>{m.value.toLocaleString(dateLocale)}</p>
            {m.sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Plan distribution ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("planDistribution")}</h2>
        <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden mb-4">
          {plans.map((p) => {
            const pct = totalOrgs ? ((planCounts[p] ?? 0) / totalOrgs) * 100 : 0;
            if (!pct) return null;
            return <div key={p} className={`${PLAN_COLOR[p]} h-full`} style={{ width: `${pct}%` }} />;
          })}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {plans.map((p) => (
            <div key={p} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PLAN_COLOR[p]}`} />
              <span className={`text-xs font-medium ${PLAN_TEXT[p]}`}>{PLAN_DISPLAY_NAME[p]}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{planCounts[p] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Weekly growth ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Orgs */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("newOrgsWeekly")}</h2>
          <div className="flex items-end gap-1.5 h-20">
            {orgWeekly.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-400 dark:text-slate-600 tabular-nums">{v || ""}</span>
                <div
                  className="w-full rounded-sm bg-indigo-500/70 dark:bg-indigo-400/60 transition-all"
                  style={{ height: `${Math.max((v / orgMax) * 52, v > 0 ? 4 : 0)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {Array.from({ length: WEEKS }).map((_, i) => (
              <div key={i} className="flex-1 text-center text-[8px] text-slate-300 dark:text-slate-700 leading-tight">
                {i === WEEKS - 1 ? t("weekCurrent") : i === WEEKS - 2 ? t("weekPrev") : weekLabel(WEEKS - 1 - i, dateLocale).split(" ")[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Sessions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("newSessionsWeekly")}</h2>
          <div className="flex items-end gap-1.5 h-20">
            {sessionWeekly.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-400 dark:text-slate-600 tabular-nums">{v || ""}</span>
                <div
                  className="w-full rounded-sm bg-emerald-500/70 dark:bg-emerald-400/60 transition-all"
                  style={{ height: `${Math.max((v / sessionMax) * 52, v > 0 ? 4 : 0)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {Array.from({ length: WEEKS }).map((_, i) => (
              <div key={i} className="flex-1 text-center text-[8px] text-slate-300 dark:text-slate-700 leading-tight">
                {i === WEEKS - 1 ? t("weekCurrent") : i === WEEKS - 2 ? t("weekPrev") : weekLabel(WEEKS - 1 - i, dateLocale).split(" ")[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top 10 orgs ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("topOrgs")}</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {topOrgs.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-600">{t("noData")}</p>
          )}
          {topOrgs.map((org, idx) => (
            <div key={org.id} className="flex items-center gap-4 px-5 py-3">
              <span className="text-sm font-bold text-slate-300 dark:text-slate-700 w-5 shrink-0 tabular-nums">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{org.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{org.slug}</p>
              </div>
              <span className={`text-xs font-semibold shrink-0 ${PLAN_TEXT[org.plan as OrgPlan]}`}>
                {PLAN_DISPLAY_NAME[org.plan as OrgPlan]}
              </span>
              <div className="flex gap-4 shrink-0 text-right">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{(org.votes ?? 0).toLocaleString(dateLocale)}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{t("votes")}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{org.sessions ?? 0}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{t("sessions")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
