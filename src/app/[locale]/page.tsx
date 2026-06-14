import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LandingPage } from "@/components/LandingPage";

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

  return <LandingPage />;
}
