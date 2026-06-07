import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("platform_role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.platform_role !== "platform_admin") redirect("/");

  const { data: membership } = await admin
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const orgSlug = (membership?.organizations as { slug: string } | null)?.slug;

  const navLinks = [
    { href: "/admin",          label: "Организации" },
    { href: "/admin/users",    label: "Пользователи" },
    { href: "/admin/feedback", label: "Обратная связь" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Mobile header — two rows */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold text-slate-900 dark:text-white">
              LivePoll <span className="text-indigo-600 dark:text-indigo-400">Admin</span>
            </span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <form action={signOut}>
                <Button type="submit" variant="ghost" className="text-sm py-1.5 px-3">Выйти</Button>
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
            {orgSlug && (
              <Link
                href={`/org/${orgSlug}`}
                className="shrink-0 ml-auto rounded-md px-3 py-1.5 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors"
              >
                ← Моя орг
              </Link>
            )}
          </div>
        </div>

        {/* Desktop header — single row */}
        <div className="hidden sm:flex mx-auto max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-slate-900 dark:text-white">
              LivePoll <span className="text-indigo-600 dark:text-indigo-400">Admin</span>
            </span>
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
            <span className="text-xs text-slate-400 dark:text-slate-500">{profile.full_name ?? user.email}</span>
            {orgSlug && (
              <Link
                href={`/org/${orgSlug}`}
                className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ← Моя организация
              </Link>
            )}
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="text-sm py-1.5 px-3">Выйти</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
