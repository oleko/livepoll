"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/actions/guards";

export async function updateProfile(
  fullName: string
): Promise<{ error?: string; success?: true }> {
  const { user, admin } = await getAuthUser();

  const trimmed = fullName.trim();
  if (!trimmed) return { error: "Имя не может быть пустым" };

  const { error } = await admin
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", user.id);
  if (error) return { error: error.message };

  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { full_name: trimmed } });

  revalidatePath("/account");
  return { success: true };
}

export async function updateEmail(
  newEmail: string
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
  if (error) return { error: error.message };

  return { success: true };
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string; success?: true }> {
  const { user } = await getAuthUser();
  const supabase = await createClient();

  // Verify current password by re-authenticating
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInError) return { error: "Неверный текущий пароль" };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: true };
}

export async function deleteAccount(): Promise<void> {
  const { user, admin } = await getAuthUser();

  // Delete all orgs where user is owner (cascades to sessions, polls, votes, etc.)
  const { data: ownedMemberships } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("role", "owner");

  for (const m of ownedMemberships ?? []) {
    await admin.from("organizations").delete().eq("id", m.organization_id);
  }

  // Delete auth user — cascade removes profiles via FK
  await admin.auth.admin.deleteUser(user.id);

  redirect("/auth/login");
}
