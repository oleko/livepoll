import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("organization_members")
      .select("organizations(slug)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const org = member?.organizations as { slug: string } | null;
    if (org?.slug) redirect(`/org/${org.slug}`);
    else redirect("/onboarding");
  }

  return (
    <main className="flex flex-1 items-center justify-center min-h-screen bg-slate-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">LivePoll AI</h1>
        <p className="text-slate-400 mb-8">Интерактивные голосования для живых мероприятий</p>
        <div className="flex gap-3 justify-center">
          <Link href="/auth/login">
            <Button>Войти</Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="secondary">Регистрация</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
