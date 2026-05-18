"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const name = (formData.get("name") as string).trim();
  if (!name) return { error: "Введите название организации" };

  let slug = toSlug(name);

  // Проверяем уникальность slug, добавляем суффикс при конфликте
  const { data: existing } = await supabase
    .from("organizations")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, slug })
    .select("id, slug")
    .single();

  if (orgError) return { error: "Не удалось создать организацию" };

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
      accepted_at: new Date().toISOString(),
    });

  if (memberError) return { error: "Не удалось добавить участника" };

  redirect(`/org/${org.slug}`);
}
