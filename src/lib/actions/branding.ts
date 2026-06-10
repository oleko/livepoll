"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BrandingSettings = {
  logo_url?: string | null;
  accent_color?: string | null;
  display_bg?: string | null;
  display_bg_image?: string | null;
  display_font?: string | null;
  display_header?: string | null;
  white_label?: boolean | null;
};

type OrgCtx = {
  admin: ReturnType<typeof createAdminClient>;
  org: { id: string; settings: Record<string, unknown> | null };
};

async function getAuthedOrg(orgSlug: string): Promise<{ error: string } | OrgCtx> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: org } = await admin
    .from("organizations")
    .select("id, settings")
    .eq("slug", orgSlug)
    .single();
  if (!org) return { error: "Организация не найдена" };

  const { data: member } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();
  if (member?.role !== "owner") return { error: "Нет прав" };

  return { admin, org };
}

async function ensureLogoBucket(admin: ReturnType<typeof createAdminClient>) {
  await admin.storage.createBucket("logos", {
    public: true,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/gif"],
    fileSizeLimit: 2 * 1024 * 1024,
  });
  // Ignore "already exists" error — bucket is ready either way
}

export async function saveBranding(
  formData: FormData,
  orgSlug: string,
): Promise<{ error: string } | { ok: true }> {
  const result = await getAuthedOrg(orgSlug);
  if ("error" in result) return result;
  const { admin, org } = result;

  const current = (org.settings as BrandingSettings | null) ?? {};
  let logo_url = current.logo_url ?? null;

  const logoFile = formData.get("logo_file") as File | null;
  if (logoFile && logoFile.size > 0) {
    await ensureLogoBucket(admin);
    const mimeToExt: Record<string, string> = {
      "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
      "image/svg+xml": "svg", "image/webp": "webp", "image/gif": "gif",
    };
    const ext = mimeToExt[logoFile.type] ?? (logoFile.name.split(".").pop() ?? "png");
    const path = `${org.id}/logo.${ext}`;
    const buffer = Buffer.from(await logoFile.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("logos")
      .upload(path, buffer, { upsert: true, contentType: logoFile.type });
    if (uploadError) return { error: `Ошибка загрузки: ${uploadError.message}` };

    const { data: { publicUrl } } = admin.storage.from("logos").getPublicUrl(path);
    logo_url = `${publicUrl}?v=${Date.now()}`;
  }

  if (formData.get("remove_logo") === "1") logo_url = null;

  const accent_color    = (formData.get("accent_color")    as string | null) || null;
  const display_bg      = (formData.get("display_bg")      as string | null) || null;
  const display_bg_image = ((formData.get("display_bg_image") as string | null) ?? "").trim() || null;
  const display_font    = (formData.get("display_font")    as string | null) || null;
  const display_header  = ((formData.get("display_header")  as string | null) ?? "").trim() || null;
  const white_label     = formData.get("white_label") === "1" ? true : null;

  const { error } = await admin
    .from("organizations")
    .update({ settings: { ...current, logo_url, accent_color, display_bg, display_bg_image, display_font, display_header, white_label } })
    .eq("id", org.id);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgSlug}/settings`);
  return { ok: true };
}
