import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import Link from "next/link";
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

  const navLinks = [
    { href: `/org/${slug}`, label: "Мероприятия" },
    ...(isOwner ? [{ href: `/org/${slug}/members`, label: "Команда" }] : []),
    ...(isOwner ? [{ href: `/org/${slug}/settings`, label: "Настройки" }] : []),
    ...(isPlatformAdmin ? [{ href: "/admin", label: "⚙ Платформа" }] : []),
    { href: "/help", label: "Помощь" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
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
              Аккаунт
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="text-sm py-1.5 px-3">
                Выйти
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {children}
      </main>
      <FeedbackWidget />
      <OnboardingTour />
    </div>
  );
}
