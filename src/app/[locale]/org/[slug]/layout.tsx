import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { OnboardingTour } from "@/components/OnboardingTour";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const { data: member } = org
    ? await admin
        .from("organization_members")
        .select("role")
        .eq("organization_id", org.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!org || !member) redirect("/onboarding");

  const isOwner = member.role === "owner";

  const { data: profile } = await admin
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single();

  const isPlatformAdmin = profile?.platform_role === "platform_admin";

  const t = await getTranslations("Org.layout");

  const navLinks = [
    { href: `/org/${slug}`, label: t("events") },
    ...(isOwner ? [{ href: `/org/${slug}/members`, label: t("team") }] : []),
    ...(isOwner ? [{ href: `/org/${slug}/settings`, label: t("settings") }] : []),
    ...(isPlatformAdmin ? [{ href: "/admin", label: t("platform") }] : []),
    { href: "/help", label: t("help") },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Mobile — два ряда */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold text-slate-900 dark:text-white truncate mr-2">{org.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <Link
                href="/account"
                className="rounded-md px-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t("account")}
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="ghost" className="text-sm py-1.5 px-2.5">{t("signOut")}</Button>
              </form>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-md px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop — один ряд */}
        <div className="hidden sm:flex mx-auto max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-slate-900 dark:text-white">{org.name}</span>
            <nav className="flex gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-medium">{org.plan}</span>
            <ThemeToggle />
            <Link
              href="/account"
              className="rounded-md px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t("account")}
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="text-sm py-1.5 px-3">{t("signOut")}</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
      <FeedbackWidget />
      <OnboardingTour />
    </div>
  );
}
