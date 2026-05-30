"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";

export async function createSection(
  sessionId: string,
  title: string,
  orgSlug: string
): Promise<{ error: string } | { id: string }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 100) return { error: "Некорректное название секции" };

  const { data: last } = await admin
    .from("session_sections")
    .select("sort_order")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("session_sections")
    .insert({ session_id: sessionId, title: trimmed, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { id: data.id };
}

export async function deleteSection(
  sectionId: string,
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  // FK ON DELETE SET NULL handles clearing section_id from polls
  await admin.from("session_sections").delete().eq("id", sectionId);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function renameSection(
  sectionId: string,
  title: string,
  sessionId: string,
  orgSlug: string
): Promise<{ error: string } | { success: true }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 100) return { error: "Некорректное название" };

  await admin.from("session_sections").update({ title: trimmed }).eq("id", sectionId);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { success: true };
}

export async function movePollSection(
  pollId: string,
  sectionId: string | null,
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await admin.from("polls").update({ section_id: sectionId } as never).eq("id", pollId);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}
