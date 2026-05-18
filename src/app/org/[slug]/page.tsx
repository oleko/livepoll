import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Используем admin чтобы исключить проблему с RLS на этапе разработки
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name, plan")
    .eq("slug", slug)
    .single();

  if (orgError) {
    console.error("Org fetch error:", orgError);
  }

  // Проверяем что пользователь — участник этой организации
  const { data: member } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", org?.id ?? "")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!org || !member) {
    console.error("No org or member:", { org, member, slug, userId: user.id });
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            <p className="text-sm text-slate-400 mt-1">
              Тариф:{" "}
              <span className="text-indigo-400 font-medium uppercase">{org.plan}</span>
              {" · "}
              <span className="text-slate-500">{member.role}</span>
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost">Выйти</Button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
          <p className="text-slate-400">Дашборд организации — в разработке</p>
          <p className="text-slate-600 text-sm mt-2">Фаза 3</p>
        </div>
      </div>
    </main>
  );
}
