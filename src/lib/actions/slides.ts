"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { broadcast as realtimeBroadcast, type Message } from "@/core/realtime/broadcast.server";

export type { SlideType, SlideContent, SlideRow, SlideRef } from "@/core/domain/slide";
import type { SlideRef, SlideType } from "@/core/domain/slide";

async function broadcastShow(sessionId: string, slide: SlideRef) {
  await realtimeBroadcast([
    { channel: "sessionSlides", id: sessionId, event: "slide_change", payload: { type: "show", slide } },
  ]);
}

export async function createSlide(
  sessionId: string,
  type: SlideType,
  content: Record<string, unknown>,
  orgSlug: string,
  sectionId?: string | null
): Promise<{ error: string } | { id: string }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const { data: last } = await admin
    .from("session_slides")
    .select("sort_order")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("session_slides")
    .insert({ session_id: sessionId, type, content, sort_order: (last?.sort_order ?? -1) + 1 } as never)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { id: data.id };
}

export async function updateSlide(
  slideId: string,
  content: Record<string, unknown>,
  sessionId: string,
  orgSlug: string
): Promise<{ error: string } | { success: true }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const { error } = await admin.from("session_slides").update({ content })
    .eq("id", slideId)
    .eq("session_id", sessionId);
  if (error) return { error: error.message };

  // If this slide is currently active, broadcast the updated content
  const { data: sess } = await admin
    .from("sessions")
    .select("active_slide_id")
    .eq("id", sessionId)
    .single();

  if ((sess as unknown as { active_slide_id?: string })?.active_slide_id === slideId) {
    const { data: slide } = await admin
      .from("session_slides")
      .select("id, type, content")
      .eq("id", slideId)
      .single();
    if (slide) await broadcastShow(sessionId, slide as SlideRef);
  }

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { success: true };
}

export async function deleteSlide(
  slideId: string,
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  // If active, clear first
  const { data: sess } = await admin
    .from("sessions")
    .select("active_slide_id")
    .eq("id", sessionId)
    .single();

  if ((sess as unknown as { active_slide_id?: string })?.active_slide_id === slideId) {
    await admin.from("sessions").update({ active_slide_id: null } as never).eq("id", sessionId);
    await realtimeBroadcast([
      { channel: "sessionSlides", id: sessionId, event: "slide_change", payload: { type: "hide" } },
    ]);
  }

  await admin.from("session_slides").delete()
    .eq("id", slideId)
    .eq("session_id", sessionId);
  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function showSlide(
  slideId: string,
  sessionId: string,
  orgSlug: string
): Promise<{ error: string } | { success: true }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const { data: slide } = await admin
    .from("session_slides")
    .select("id, type, content")
    .eq("id", slideId)
    .eq("session_id", sessionId)
    .single();

  if (!slide) return { error: "Слайд не найден" };

  await admin.from("sessions").update({ active_slide_id: slideId } as never).eq("id", sessionId);

  const slideRef = slide as SlideRef;
  const messages: Message[] = [
    { channel: "sessionSlides", id: sessionId, event: "slide_change", payload: { type: "show", slide: slideRef } },
  ];

  // For announcement slides, also broadcast to participants so they see the overlay on their phones
  if (slideRef.type === "announcement") {
    const c = slideRef.content as { text?: string; duration?: number };
    messages.push({
      channel: "sessionPolls",
      id: sessionId,
      event: "announcement",
      payload: { text: c.text ?? "", duration: c.duration ?? 0, started_at: new Date().toISOString() },
    });
  }

  await realtimeBroadcast(messages);
  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
  return { success: true };
}

export async function reorderSlides(
  sessionId: string,
  orderedIds: string[],
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await Promise.all(
    orderedIds.map((id, idx) =>
      admin.from("session_slides").update({ sort_order: idx } as never)
        .eq("id", id)
        .eq("session_id", sessionId)
    )
  );

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function revealAnswer(
  slideId: string,
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await realtimeBroadcast([
    { channel: "sessionSlides", id: sessionId, event: "slide_reveal", payload: { slide_id: slideId } },
  ]);
}

export async function hideSlide(
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  // Check if the currently active slide is an announcement — if so, clear participant overlay too
  const { data: sess } = await admin
    .from("sessions")
    .select("active_slide_id")
    .eq("id", sessionId)
    .single();

  const messages: Message[] = [
    { channel: "sessionSlides", id: sessionId, event: "slide_change", payload: { type: "hide" } },
  ];

  if ((sess as unknown as { active_slide_id?: string })?.active_slide_id) {
    const { data: activeSlide } = await admin
      .from("session_slides")
      .select("type")
      .eq("id", (sess as unknown as { active_slide_id: string }).active_slide_id)
      .single();
    if ((activeSlide as unknown as { type?: string })?.type === "announcement") {
      messages.push({
        channel: "sessionPolls",
        id: sessionId,
        event: "announcement",
        payload: { clear: true },
      });
    }
  }

  await admin.from("sessions").update({ active_slide_id: null } as never).eq("id", sessionId);
  await realtimeBroadcast(messages);
  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function duplicateSlide(
  slideId: string,
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const { data: srcRaw } = await admin
    .from("session_slides")
    .select("type, content, section_id")
    .eq("id", slideId)
    .eq("session_id", sessionId)
    .single();

  if (!srcRaw) return;
  const src = srcRaw as unknown as { type: string; content: Record<string, unknown>; section_id: string | null };

  const { data: last } = await admin
    .from("session_slides")
    .select("sort_order")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("session_slides").insert({
    session_id: sessionId,
    type: src.type,
    content: src.content,
    section_id: src.section_id,
    sort_order: (last?.sort_order ?? -1) + 1,
  } as never);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function startSpinWheel(
  slideId: string,
  sessionId: string,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  // Only broadcast if this slide is currently active
  const { data: sess } = await admin
    .from("sessions")
    .select("active_slide_id")
    .eq("id", sessionId)
    .single();

  if ((sess as unknown as { active_slide_id?: string })?.active_slide_id !== slideId) return;

  await realtimeBroadcast([
    { channel: "sessionSlides", id: sessionId, event: "spin_start", payload: { slide_id: slideId } },
  ]);
}

export async function moveSlideToSection(
  slideId: string,
  sessionId: string,
  sectionId: string | null,
  orgSlug: string
): Promise<void> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await admin.from("session_slides").update({ section_id: sectionId } as never)
    .eq("id", slideId)
    .eq("session_id", sessionId);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}
