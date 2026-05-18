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
    console.error("Org create error:", orgError);
    return { error: `Ошибка: ${orgError.message}` };
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
    console.error("Member create error:", memberError);
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: `Ошибка добавления участника: ${memberError.message}` };
  }

  return { redirectTo: `/org/${org.slug}` };
}
