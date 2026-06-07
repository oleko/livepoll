"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { OrgPlan } from "@/types/database";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single();

  if (profile?.platform_role !== "platform_admin") throw new Error("Нет доступа");
  return admin;
}

export async function setOrgPlan(orgId: string, plan: OrgPlan, expiresAt: string | null) {
  const admin = await requirePlatformAdmin();
  await admin
    .from("organizations")
    .update({ plan, plan_expires_at: expiresAt || null })
    .eq("id", orgId);
  revalidatePath("/admin");
}

export async function setPlatformRole(userId: string, role: "user" | "platform_admin") {
  const admin = await requirePlatformAdmin();
  await admin
    .from("profiles")
    .update({ platform_role: role })
    .eq("id", userId);
  revalidatePath("/admin/users");
}

export async function createPlatformUser(formData: FormData) {
  const admin = await requirePlatformAdmin();

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const fullName = (formData.get("full_name") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  const role = (formData.get("role") as string) === "platform_admin" ? "platform_admin" : "user";

  if (!email || !password) return { error: "Email и пароль обязательны" };
  if (password.length < 8) return { error: "Пароль минимум 8 символов" };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) return { error: error.message };

  if (role === "platform_admin" && data.user) {
    await admin.from("profiles").update({ platform_role: "platform_admin" }).eq("id", data.user.id);
  }

  revalidatePath("/admin/users");
  return { success: true as const };
}

export async function deleteOrganization(orgId: string) {
  const admin = await requirePlatformAdmin();

  // Удаляем в порядке зависимостей (FK без CASCADE)
  const { data: sessions } = await admin
    .from("sessions")
    .select("id")
    .eq("organization_id", orgId);

  const sessionIds = sessions?.map((s) => s.id) ?? [];

  if (sessionIds.length > 0) {
    const { data: polls } = await admin
      .from("polls")
      .select("id")
      .in("session_id", sessionIds);

    const pollIds = polls?.map((p) => p.id) ?? [];
    if (pollIds.length > 0) {
      await admin.from("votes").delete().in("poll_id", pollIds);
      await admin.from("polls").delete().in("id", pollIds);
    }

    const { data: questions } = await admin
      .from("questions")
      .select("id")
      .in("session_id", sessionIds);

    const questionIds = questions?.map((q) => q.id) ?? [];
    if (questionIds.length > 0) {
      await admin.from("question_upvotes").delete().in("question_id", questionIds);
      await admin.from("questions").delete().in("id", questionIds);
    }

    await admin.from("sessions").delete().in("id", sessionIds);
  }

  await admin.from("organization_members").delete().eq("organization_id", orgId);

  const { error } = await admin.from("organizations").delete().eq("id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function confirmUserEmail(userId: string): Promise<void> {
  const admin = await requirePlatformAdmin();
  await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const admin = await requirePlatformAdmin();

  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();
  if (me?.id === userId) throw new Error("Нельзя удалить себя");

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
