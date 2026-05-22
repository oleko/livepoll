"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/actions/organizations";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не удалось получить пользователя" };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .limit(1)
    .maybeSingle();

  const slug = (member?.organizations as { slug: string } | null)?.slug;
  if (slug) return { redirectTo: `/org/${slug}` };

  const newSlug = await ensureUserOrg(user.id, user.user_metadata?.full_name);
  return { redirectTo: newSlug ? `/org/${newSlug}` : "/onboarding" };
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const fullName = (formData.get("full_name") as string)?.trim();

  const { data, error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) return { error: error.message };

  const userId = data.user?.id;
  if (userId) {
    const slug = await ensureUserOrg(userId, fullName);
    if (slug) return { redirectTo: `/org/${slug}` };
  }

  return { redirectTo: "/onboarding" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function signInWithYandex(): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "yandex" as Parameters<typeof supabase.auth.signInWithOAuth>[0]["provider"],
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error || !data.url) redirect("/auth/login?error=oauth_failed");
  redirect(data.url);
}
