"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type MemberState = { error: string } | { success: true } | null;

export async function inviteMember(
  _prevState: MemberState,
  formData: FormData
): Promise<MemberState> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const orgId = formData.get("org_id") as string;
  const orgSlug = formData.get("org_slug") as string;

  if (!email) return { error: "Введите email" };

  // Ищем пользователя по email через profiles
  const { data: invitedUser } = await admin
    .from("profiles")
    .select("id")
    .eq("id", (
      await admin.auth.admin.listUsers()
    ).data.users.find((u) => u.email === email)?.id ?? "")
    .maybeSingle();

  if (!invitedUser) {
    return { error: "Пользователь с таким email не зарегистрирован" };
  }

  const { error } = await admin.from("organization_members").insert({
    organization_id: orgId,
    user_id: invitedUser.id,
    role: "host",
    invited_by: user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "Пользователь уже в команде" };
    return { error: error.message };
  }

  revalidatePath(`/org/${orgSlug}/members`);
  return { success: true };
}

export async function removeMember(memberId: string, orgSlug: string) {
  const admin = createAdminClient();
  await admin.from("organization_members").delete().eq("id", memberId);
  revalidatePath(`/org/${orgSlug}/members`);
}

export async function changeMemberRole(
  memberId: string,
  role: "owner" | "host",
  orgSlug: string
) {
  const admin = createAdminClient();
  await admin.from("organization_members").update({ role }).eq("id", memberId);
  revalidatePath(`/org/${orgSlug}/members`);
}
