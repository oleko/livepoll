import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PLAN_DISPLAY_NAME } from "@/lib/limits";
import { PLAN_PRICES } from "@/lib/actions/billing";
import { UpgradeButton } from "./UpgradeButton";
import type { OrgPlan } from "@/types/database";

const PLAN_ORDER: OrgPlan[] = ["free", "starter", "pro", "team", "unlimited"];

const PLANS: {
  key: OrgPlan;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    key: "starter",
    features: [
      "До 100 участников",
      "Безлимит мероприятий",
      "10 опросов на сессию",
      "Экспорт CSV / PDF",
      "Шаблоны мероприятий",
    ],
  },
  {
    key: "pro",
    highlight: true,
    features: [
      "До 500 участников",
      "Безлимит опросов",
      "✨ AI-анализ и AI-резюме",
      "Все типы слайдов и экранов",
      "Таймер, лимит голосов, Quiz",
    ],
  },
  {
    key: "team",
    features: [
      "Безлимит участников",
      "До 5 ведущих в команде",
      "White Label брендинг",
      "Все функции Про",
      "Приоритетная поддержка",
    ],
  },
];

export default async function UpgradePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, plan")
    .eq("slug", slug)
    .single();

  if (!org) redirect(`/org/${slug}`);

  const { data: member } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (member?.role !== "owner") redirect(`/org/${slug}`);

  const currentPlanIdx = PLAN_ORDER.indexOf(org.plan as OrgPlan);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href={`/org/${slug}/settings`}
          className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          ← Настройки
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-3 mb-1">Сменить тариф</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Текущий тариф:{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {PLAN_DISPLAY_NAME[org.plan as OrgPlan]}
          </span>
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const planIdx = PLAN_ORDER.indexOf(p.key);
          const isCurrent = org.plan === p.key;
          const isDowngrade = planIdx < currentPlanIdx;
          const price = PLAN_PRICES[p.key];

          return (
            <div
              key={p.key}
              className={`rounded-2xl border p-5 flex flex-col gap-4 ${
                p.highlight
                  ? "border-indigo-400/60 bg-indigo-600/5 dark:bg-indigo-600/10"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              }`}
            >
              {p.highlight && (
                <span className="self-start text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full">
                  Популярный
                </span>
              )}

              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {PLAN_DISPLAY_NAME[p.key]}
                </p>
                {price ? (
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {price.rubles.toLocaleString("ru-RU")} ₽
                    </span>
                    <span className="text-sm text-slate-500">/ мес</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">по запросу</p>
                )}
              </div>

              <ul className="flex flex-col gap-1.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-indigo-500 shrink-0 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-center text-slate-500 dark:text-slate-400">
                  Текущий тариф
                </div>
              ) : isDowngrade ? (
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-2 text-xs text-center text-slate-400 dark:text-slate-600">
                  Понижение тарифа — напишите нам
                </div>
              ) : price ? (
                <UpgradeButton
                  orgId={org.id}
                  plan={p.key}
                  orgSlug={slug}
                  label={`Перейти на ${PLAN_DISPLAY_NAME[p.key]}`}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors active:scale-[0.97] ${
                    p.highlight
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900"
                  }`}
                />
              ) : (
                <a
                  href="mailto:oleko85@gmail.com?subject=LivePoll%20AI%20%E2%80%94%20Безлимитный%20тариф"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-center text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition-colors"
                >
                  Связаться с нами
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-slate-400 dark:text-slate-600 text-center">
        Оплата картой через ЮKassa. Тариф активируется автоматически после подтверждения платежа.
        Вопросы — <a href="mailto:oleko85@gmail.com" className="hover:underline">oleko85@gmail.com</a>
      </p>
    </div>
  );
}
