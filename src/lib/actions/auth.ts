"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: error.message };

  // Проверяем есть ли организация у пользователя
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не удалось получить пользователя" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, organizations!inner(slug)")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (!member) redirect("/onboarding");

  const slug = (member as unknown as { organizations: { slug: string } }).organizations.slug;
  redirect(`/org/${slug}`);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: { full_name: formData.get("full_name") as string },
    },
  });

  if (error) return { error: error.message };

  redirect("/onboarding");
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
