"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLimits } from "@/lib/limits";
import type { OrgPlan } from "@/types/database";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";
import { broadcast as realtimeBroadcast } from "@/core/realtime/broadcast.server";

type SessionState = { error: string } | { redirectTo: string } | null;

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createSession(
  _prev: SessionState,
  formData: FormData
): Promise<SessionState> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const title = (formData.get("title") as string)?.trim();
  const orgId = formData.get("org_id") as string;
  const orgSlug = formData.get("org_slug") as string;
  const mode = (formData.get("mode") as string) === "quiz" ? "quiz" : "conference";

  if (!title) return { error: "Введите название мероприятия" };

  // Проверяем лимит мероприятий по тарифу
  const { data: org } = await admin
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  if (org) {
    const limits = getLimits(org.plan as OrgPlan);
    if (isFinite(limits.sessionsPerMonth)) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count } = await admin
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("created_at", monthStart.toISOString());

      if ((count ?? 0) >= limits.sessionsPerMonth) {
        return {
          error: `Лимит мероприятий на текущий месяц исчерпан (${limits.sessionsPerMonth}). Перейдите на более высокий тариф.`,
        };
      }
    }
  }

  // Генерируем уникальный код
  let join_code = generateJoinCode();
  const { data: existing } = await admin
    .from("sessions")
    .select("id")
    .eq("join_code", join_code)
    .maybeSingle();
  if (existing) join_code = generateJoinCode();

  const sessionSettings: Record<string, unknown> =
    mode === "quiz"
      ? { championship: { enabled: true, auto: true, reveal_duration: 10 } }
      : {};

  const { data: session, error } = await admin
    .from("sessions")
    .insert({ title, organization_id: orgId, created_by: user.id, join_code, mode, settings: sessionSettings })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Создаём опросы из шаблона
  const templateId = (formData.get("template_id") as string) || "";
  if (templateId) {
    const { getTemplate } = await import("@/lib/templates");
    const template = getTemplate(templateId);
    if (template && template.polls.length > 0) {
      const pollsToInsert = template.polls.map((p, i) => ({
        session_id: session.id,
        created_by: user.id,
        title: p.title,
        type: p.type,
        options: p.options,
        settings: {},
        sort_order: i,
      }));
      await admin.from("polls").insert(pollsToInsert);
    }
  }

  return { redirectTo: `/org/${orgSlug}/sessions/${session.id}` };
}

export async function setAttendees(
  sessionId: string,
  count: number,
  orgSlug: string
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const clamped = Math.max(0, Math.floor(count));
  await admin
    .from("sessions")
    .update({ total_attendees: clamped } as never)
    .eq("id", sessionId);

  await realtimeBroadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "attendees_update",
    payload: { total: clamped },
  }]);

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}

export async function startAnnouncement(
  sessionId: string,
  text: string,
  durationSec: number,
  orgSlug: string
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);
  if (!text.trim() || text.length > 200) return { error: "Введите текст объявления" };
  await realtimeBroadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "announcement",
    payload: { text: text.trim(), duration: durationSec, started_at: new Date().toISOString() },
  }]);
  return { success: true };
}

export async function revealPoker(sessionId: string, orgSlug: string) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);
  await realtimeBroadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "poker_reveal",
    payload: {},
  }]);
  return { success: true };
}

export async function clearAnnouncement(sessionId: string, orgSlug: string) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);
  await realtimeBroadcast([{
    channel: "sessionPolls",
    id: sessionId,
    event: "announcement",
    payload: { clear: true },
  }]);
  return { success: true };
}

async function generateFarewell(): Promise<string> {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) return "Спасибо за участие! До встречи!";

  try {
    const res = await fetch("https://llm.api.cloud.yandex.net/foundationModels/v1/completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt-lite/latest`,
        completionOptions: { stream: false, temperature: 0.8, maxTokens: "80" },
        messages: [
          {
            role: "system",
            text: "Ты ведущий мероприятия. Пиши кратко, тепло и по-русски.",
          },
          {
            role: "user",
            text: "Мероприятие завершилось. Напиши одно короткое прощальное пожелание участникам — 1-2 предложения, тепло и с энергией. Без кавычек, без предисловий.",
          },
        ],
      }),
    });
    if (!res.ok) return "Спасибо за участие! До встречи!";
    const data = await res.json() as { result?: { alternatives?: { message?: { text?: string } }[] } };
    return data.result?.alternatives?.[0]?.message?.text?.trim() || "Спасибо за участие! До встречи!";
  } catch {
    return "Спасибо за участие! До встречи!";
  }
}

export async function duplicateSession(
  sessionId: string,
  orgSlug: string
): Promise<{ error: string } | { redirectTo: string }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  // Fetch source session
  const { data: source } = await admin
    .from("sessions")
    .select("title, organization_id, mode, settings, total_attendees")
    .eq("id", sessionId)
    .single();
  if (!source) return { error: "Мероприятие не найдено" };

  // Check sessions/month limit
  const { data: org } = await admin
    .from("organizations")
    .select("plan")
    .eq("id", source.organization_id)
    .single();
  if (org) {
    const limits = getLimits(org.plan as OrgPlan);
    if (isFinite(limits.sessionsPerMonth)) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await admin
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", source.organization_id)
        .gte("created_at", monthStart.toISOString());
      if ((count ?? 0) >= limits.sessionsPerMonth) {
        return { error: `Лимит мероприятий на месяц исчерпан (${limits.sessionsPerMonth}). Перейдите на более высокий тариф.` };
      }
    }
  }

  // Generate unique join code
  let join_code = generateJoinCode();
  const { data: codeExists } = await admin.from("sessions").select("id").eq("join_code", join_code).maybeSingle();
  if (codeExists) join_code = generateJoinCode();

  // Create new session — carries mode, settings (e.g. championship config) and
  // planned attendee count from the source; a copy of a quiz event should stay a quiz event.
  const { data: newSession, error: sessionErr } = await admin
    .from("sessions")
    .insert({
      title: `${source.title} (копия)`,
      organization_id: source.organization_id,
      created_by: user.id,
      join_code,
      mode: source.mode,
      settings: source.settings,
      total_attendees: source.total_attendees,
    })
    .select("id")
    .single();
  if (sessionErr || !newSession) return { error: "Не удалось создать копию" };

  const newSessionId = newSession.id;

  // Copy sections (build old → new id mapping)
  const { data: sections } = await admin
    .from("session_sections")
    .select("id, title, sort_order")
    .eq("session_id", sessionId)
    .order("sort_order");
  const sectionMap = new Map<string, string>();
  if (sections && sections.length > 0) {
    const { data: newSections } = await admin
      .from("session_sections")
      .insert(sections.map((s) => ({ session_id: newSessionId, title: s.title, sort_order: s.sort_order })))
      .select("id, sort_order");
    if (newSections) {
      sections.forEach((old, i) => {
        const created = newSections[i];
        if (created) sectionMap.set(old.id, created.id);
      });
    }
  }

  // Copy polls (check pollsPerSession limit)
  const { data: polls } = await admin
    .from("polls")
    .select("id, title, type, options, settings, sort_order, section_id")
    .eq("session_id", sessionId)
    .order("sort_order");
  if (polls && polls.length > 0) {
    const limits = getLimits((org?.plan ?? "free") as OrgPlan);
    const allowed = isFinite(limits.pollsPerSession) ? limits.pollsPerSession : polls.length;
    const pollsToInsert = polls.slice(0, allowed).map((p) => {
      const s = (p.settings ?? {}) as Record<string, unknown>;
      const copied = { ...s };
      delete copied["activated_at"];
      const newSectionId = p.section_id ? (sectionMap.get(p.section_id) ?? null) : null;
      return {
        session_id: newSessionId,
        created_by: user.id,
        title: p.title,
        type: p.type,
        options: p.options,
        settings: copied,
        sort_order: p.sort_order,
        section_id: newSectionId,
      };
    });
    await admin.from("polls").insert(pollsToInsert);
  }

  // Copy slides
  const { data: slides } = await admin
    .from("session_slides")
    .select("type, content, sort_order, section_id")
    .eq("session_id", sessionId)
    .order("sort_order");
  if (slides && slides.length > 0) {
    await admin.from("session_slides").insert(
      slides.map((sl) => ({
        session_id: newSessionId,
        type: sl.type,
        content: sl.content,
        sort_order: sl.sort_order,
        section_id: sl.section_id ? (sectionMap.get(sl.section_id) ?? null) : null,
      }))
    );
  }

  revalidatePath(`/org/${orgSlug}`);
  return { redirectTo: `/org/${orgSlug}/sessions/${newSessionId}` };
}

export async function updateSessionStatus(
  sessionId: string,
  status: "active" | "ended",
  orgSlug: string
) {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);
  await admin
    .from("sessions")
    .update({ status, ...(status === "ended" ? { ended_at: new Date().toISOString() } : {}) })
    .eq("id", sessionId);

  if (status === "ended") {
    await admin
      .from("polls")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("status", "active");

    const farewell = await generateFarewell();
    await realtimeBroadcast([{
      channel: "sessionPolls",
      id: sessionId,
      event: "session_ended",
      payload: { farewell },
    }]);
  }

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}
