"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { setOrgPlan } from "@/lib/actions/admin";
import type { OrgPlan } from "@/types/database";
import { PLAN_DISPLAY_NAME } from "@/lib/limits";

const PLANS: OrgPlan[] = ["free", "starter", "pro", "team", "unlimited"];

export function OrgPlanForm({
  orgId,
  currentPlan,
  currentExpires,
}: {
  orgId: string;
  currentPlan: OrgPlan;
  currentExpires: string | null;
}) {
  const t = useTranslations("Admin.orgPlan");
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<OrgPlan>(currentPlan);
  const [expires, setExpires] = useState(
    currentExpires ? currentExpires.slice(0, 10) : ""
  );
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await setOrgPlan(orgId, plan, expires || null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const changed = plan !== currentPlan || (expires || null) !== (currentExpires ? currentExpires.slice(0, 10) : null);

  function applyPeriod(months: number | "event") {
    const base = new Date();
    if (months === "event") {
      base.setDate(base.getDate() + 30);
    } else {
      base.setMonth(base.getMonth() + months);
    }
    setExpires(base.toISOString().slice(0, 10));
    setSaved(false);
  }

  const periods: { labelKey: string; value: number | "event" }[] = [
    { labelKey: "period1event", value: "event" },
    { labelKey: "period1mo",   value: 1 },
    { labelKey: "period6mo",   value: 6 },
    { labelKey: "period1yr",   value: 12 },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value as OrgPlan); setSaved(false); }}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>{PLAN_DISPLAY_NAME[p]}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          {periods.map((p) => (
            <button
              key={String(p.value)}
              type="button"
              onClick={() => applyPeriod(p.value)}
              className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {t(p.labelKey as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        <input
          type="date"
          value={expires}
          onChange={(e) => { setExpires(e.target.value); setSaved(false); }}
          title={t("expiresTitle")}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          onClick={save}
          disabled={pending || !changed}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            saved
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : changed
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default"
          }`}
        >
          {saved ? t("saved") : pending ? "…" : t("save")}
        </button>
      </div>

      {expires && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("expires", { date: new Date(expires).toLocaleDateString() })}
        </p>
      )}
    </div>
  );
}
