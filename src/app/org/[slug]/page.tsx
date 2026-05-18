import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import type { Organization } from "@/types/database";

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, plan")
    .eq("slug", slug)
    .single() as { data: Pick<Organization, "id" | "name" | "plan"> | null; error: unknown };

  if (!org) redirect("/onboarding");

  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            <p className="text-sm text-slate-400 mt-1">
              Тариф: <span className="text-indigo-400 font-medium uppercase">{org.plan}</span>
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
