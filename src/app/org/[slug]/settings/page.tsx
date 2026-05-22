import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getLimits, formatLimit, PLAN_DISPLAY_NAME } from "@/lib/limits";

export default async function SettingsPage({
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
    .select("id, name, slug, plan, plan_expires_at, created_at")
    .eq("slug", slug)
    .single();

  if (!org) redirect("/onboarding");

  const { data: member } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (member?.role !== "owner") redirect(`/org/${slug}`);

  const limits = getLimits(org.plan);


  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Настройки</h1>
      </div>

      <div className="flex flex-col gap-4">
        {/* Org info */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Организация</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Название</span>
              <span className="text-slate-900 dark:text-white">{org.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">URL-адрес</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">/org/{org.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Создана</span>
              <span className="text-slate-600 dark:text-slate-300">
                {new Date(org.created_at).toLocaleDateString("ru-RU")}
              </span>
            </div>
          </div>
        </div>

        {/* Plan & limits */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Тариф</h2>
            <span className="rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
              {PLAN_DISPLAY_NAME[org.plan]}
            </span>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Мероприятий в месяц</span>
              <span className="text-slate-600 dark:text-slate-300">{formatLimit(limits.sessionsPerMonth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Опросов на мероприятие</span>
              <span className="text-slate-600 dark:text-slate-300">{formatLimit(limits.pollsPerSession)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Участников в команде</span>
              <span className="text-slate-600 dark:text-slate-300">{formatLimit(limits.members)}</span>
            </div>
          </div>
          {org.plan === "free" && (
            <div className="mt-4 rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400">
              Для снятия ограничений перейдите на Pro тариф
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
