import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileForm } from "./ProfileForm";
import { EmailForm } from "./EmailForm";
import { PasswordForm } from "./PasswordForm";
import { DeleteAccount } from "./DeleteAccount";

export const metadata = { title: "Аккаунт | Kvoroom" };

export default async function AccountPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: member } = await admin
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  const orgSlug = (member?.organizations as { slug: string } | null)?.slug;
  const isOAuth = (user.app_metadata?.provider ?? "email") !== "email";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          {orgSlug ? (
            <Link
              href={`/org/${orgSlug}`}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              ← Мероприятия
            </Link>
          ) : (
            <span />
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Аккаунт</h1>

        <div className="flex flex-col gap-4">
          <ProfileForm
            initialName={profile?.full_name ?? ""}
            email={user.email ?? ""}
          />

          {!isOAuth && <EmailForm currentEmail={user.email ?? ""} />}

          {!isOAuth && <PasswordForm />}

          {isOAuth && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
              Вы вошли через Яндекс — смена email и пароля доступна в настройках Яндекс ID.
            </div>
          )}

          <DeleteAccount />
        </div>
      </main>
    </div>
  );
}
