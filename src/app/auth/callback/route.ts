import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase
          .from("organization_members")
          .select("organization_id, organizations!inner(slug)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        const slug = member
          ? (member as unknown as { organizations: { slug: string } }).organizations.slug
          : null;
        return NextResponse.redirect(slug ? `${origin}/org/${slug}` : `${origin}/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
