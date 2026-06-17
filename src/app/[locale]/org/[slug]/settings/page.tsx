import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { getLimits, formatLimit, PLAN_DISPLAY_NAME } from "@/lib/limits";
import { BrandingForm } from "./BrandingForm";
import type { BrandingSettings } from "@/lib/actions/branding";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const t = await getTranslations("Org.settings");
  const locale = await getLocale();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug, plan, plan_expires_at, settings, created_at")
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
  const branding = (org.settings as BrandingSettings | null) ?? {};
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("title")}</h1>
      </div>

      <div className="flex flex-col gap-4">
        {/* Org info */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("orgSection")}</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t("orgName")}</span>
              <span className="text-slate-900 dark:text-white">{org.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("orgUrl")}</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">/org/{org.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("orgCreated")}</span>
              <span className="text-slate-600 dark:text-slate-300">
                {new Date(org.created_at).toLocaleDateString(dateLocale)}
              </span>
            </div>
          </div>
        </div>

        {/* Plan & limits */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("planSection")}</h2>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                {PLAN_DISPLAY_NAME[org.plan]}
              </span>
              {org.plan !== "unlimited" && (
                <Link
                  href={`/org/${slug}/upgrade`}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t("planChange")}
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t("sessionsPerMonth")}</span>
              <span className="text-slate-600 dark:text-slate-300">{formatLimit(limits.sessionsPerMonth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("pollsPerSession")}</span>
              <span className="text-slate-600 dark:text-slate-300">{formatLimit(limits.pollsPerSession)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("membersLimit")}</span>
              <span className="text-slate-600 dark:text-slate-300">{formatLimit(limits.members)}</span>
            </div>
          </div>
          {org.plan !== "unlimited" && (
            <Link
              href={`/org/${slug}/upgrade`}
              className="mt-4 flex items-center justify-between rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/15 transition-colors"
            >
              <span>
                {org.plan === "free"
                  ? t("planUpgradeFree")
                  : t("planUpgradePaid")}
              </span>
              <span>→</span>
            </Link>
          )}
        </div>

        <BrandingForm orgSlug={slug} initial={branding} orgPlan={org.plan} />
      </div>
    </div>
  );
}
