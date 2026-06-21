"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { getLimits } from "@/lib/limits";
import type { OrgPlan } from "@/types/database";

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
  await admin.from("session_sections").delete()
    .eq("id", sectionId)
    .eq("session_id", sessionId);

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

  await admin.from("session_sections").update({ title: trimmed })
    .eq("id", sectionId)
    .eq("session_id", sessionId);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { success: true };
}

export async function copySection(
  sectionId: string,
  sourceSessionId: string,
  targetSessionId: string,
  orgSlug: string
): Promise<{ error: string } | { success: true }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sourceSessionId, admin);
  await assertSessionMember(user.id, targetSessionId, admin);

  // Fetch source section + its polls
  const { data: section } = await admin
    .from("session_sections")
    .select("title")
    .eq("id", sectionId)
    .eq("session_id", sourceSessionId)
    .single();
  if (!section) return { error: "Секция не найдена" };

  const { data: polls } = await admin
    .from("polls")
    .select("title, type, options, settings, sort_order")
    .eq("session_id", sourceSessionId)
    .eq("section_id", sectionId)
    .order("sort_order");

  // Check pollsPerSession limit for target session
  if (polls && polls.length > 0) {
    const { data: targetSession } = await admin
      .from("sessions")
      .select("organization_id")
      .eq("id", targetSessionId)
      .single();
    if (targetSession) {
      const { data: org } = await admin
        .from("organizations")
        .select("plan")
        .eq("id", targetSession.organization_id)
        .single();
      if (org) {
        const limits = getLimits(org.plan as OrgPlan);
        if (isFinite(limits.pollsPerSession)) {
          const { count } = await admin
            .from("polls")
            .select("id", { count: "exact", head: true })
            .eq("session_id", targetSessionId);
          const free = limits.pollsPerSession - (count ?? 0);
          if (free <= 0) {
            return { error: `Лимит опросов в мероприятии исчерпан (${limits.pollsPerSession}). Перейдите на более высокий тариф.` };
          }
          polls.splice(free);
        }
      }
    }
  }

  // Create new section in target
  const { data: lastSection } = await admin
    .from("session_sections")
    .select("sort_order")
    .eq("session_id", targetSessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: newSection, error: sErr } = await admin
    .from("session_sections")
    .insert({ session_id: targetSessionId, title: section.title, sort_order: (lastSection?.sort_order ?? -1) + 1 })
    .select("id")
    .single();
  if (sErr || !newSection) return { error: "Не удалось создать секцию" };

  // Copy polls into new section
  if (polls && polls.length > 0) {
    const { data: lastPoll } = await admin
      .from("polls")
      .select("sort_order")
      .eq("session_id", targetSessionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextOrder = (lastPoll?.sort_order ?? -1) + 1;

    await admin.from("polls").insert(
      polls.map((p) => {
        const s = (p.settings ?? {}) as Record<string, unknown>;
        const copied = { ...s };
        delete copied["activated_at"];
        return {
          session_id: targetSessionId,
          created_by: user.id,
          title: p.title,
          type: p.type,
          options: p.options,
          settings: copied,
          sort_order: nextOrder++,
          section_id: newSection.id,
        };
      })
    );
  }

  revalidatePath(`/org/${orgSlug}/sessions/${targetSessionId}`);
  if (sourceSessionId !== targetSessionId) {
    revalidatePath(`/org/${orgSlug}/sessions/${sourceSessionId}`);
  }
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

  await admin.from("polls").update({ section_id: sectionId } as never)
    .eq("id", pollId)
    .eq("session_id", sessionId);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}
