import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");
  return { user, admin: createAdminClient() };
}

/** Throws if userId is not a member of the org that owns sessionId */
export async function assertSessionMember(
  userId: string,
  sessionId: string,
  admin: AdminClient
) {
  const { data: session } = await admin
    .from("sessions")
    .select("organization_id")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Сессия не найдена");

  const { data: member } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", session.organization_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) throw new Error("Нет доступа");
}

/** Throws if userId is not an owner of orgId */
export async function assertOrgOwner(
  userId: string,
  orgId: string,
  admin: AdminClient
) {
  const { data: member } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (member?.role !== "owner") throw new Error("Нет доступа");
}

/** Given a memberId, throws if callerId is not owner of the same org */
export async function assertOwnerOfMemberOrg(
  callerId: string,
  memberId: string,
  admin: AdminClient
) {
  const { data: target } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("id", memberId)
    .single();
  if (!target) throw new Error("Участник не найден");
  await assertOrgOwner(callerId, target.organization_id, admin);
}
