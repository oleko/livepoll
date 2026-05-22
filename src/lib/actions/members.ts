"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getLimits } from "@/lib/limits";
import type { OrgPlan } from "@/types/database";
import { getAuthUser, assertOrgOwner, assertOwnerOfMemberOrg } from "@/lib/actions/guards";

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

  // Только owner может приглашать
  try {
    await assertOrgOwner(user.id, orgId, admin);
  } catch {
    return { error: "Нет прав для приглашения участников" };
  }

  // Проверяем лимит участников по тарифу
  const { data: org } = await admin
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  if (org) {
    const limits = getLimits(org.plan as OrgPlan);
    const { count } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);

    if ((count ?? 0) >= limits.members) {
      return {
        error: `Лимит участников команды исчерпан (${limits.members}). Перейдите на более высокий тариф.`,
      };
    }
  }

  const { data: authList } = await admin.auth.admin.listUsers();
  const authUser = authList?.users.find((u) => u.email === email);

  const { data: invitedUser } = authUser
    ? await admin.from("profiles").select("id").eq("id", authUser.id).maybeSingle()
    : { data: null };

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
  try {
    const { user, admin } = await getAuthUser();
    await assertOwnerOfMemberOrg(user.id, memberId, admin);
    await admin.from("organization_members").delete().eq("id", memberId);
    revalidatePath(`/org/${orgSlug}/members`);
  } catch {
    // не раскрываем причину отказа
  }
}

export async function changeMemberRole(
  memberId: string,
  role: "owner" | "host",
  orgSlug: string
) {
  try {
    const { user, admin } = await getAuthUser();
    await assertOwnerOfMemberOrg(user.id, memberId, admin);
    await admin.from("organization_members").update({ role }).eq("id", memberId);
    revalidatePath(`/org/${orgSlug}/members`);
  } catch {
    // не раскрываем причину отказа
  }
}
