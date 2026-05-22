"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OrgState = { error: string } | { redirectTo: string } | null;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48) || "org";
}

export async function ensureUserOrg(userId: string, displayName?: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const slug = (existing?.organizations as { slug: string } | null)?.slug;
  if (slug) return slug;

  const name = displayName?.trim() || "Мои мероприятия";
  let orgSlug = toSlug(name);
  if (!orgSlug) orgSlug = "org";

  const { data: taken } = await admin
    .from("organizations")
    .select("slug")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (taken) orgSlug = `${orgSlug}-${Date.now().toString(36)}`;

  const { data: org, error } = await admin
    .from("organizations")
    .insert({ name, slug: orgSlug })
    .select("id, slug")
    .single();

  if (error || !org) return null;

  await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });

  return org.slug;
}

export async function createOrganization(
  _prevState: OrgState,
  formData: FormData
): Promise<OrgState> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Введите название организации" };

  let slug = toSlug(name);
  if (!slug) slug = `org-${Date.now().toString(36)}`;

  const { data: existing } = await admin
    .from("organizations")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, slug })
    .select("id, slug")
    .single();

  if (orgError) {
    console.error("[org] create failed:", orgError.code);
    return { error: "Не удалось создать организацию. Попробуйте позже." };
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
      accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    console.error("[org] member insert failed:", memberError.code);
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: "Не удалось добавить участника. Попробуйте позже." };
  }

  return { redirectTo: `/org/${org.slug}` };
}
