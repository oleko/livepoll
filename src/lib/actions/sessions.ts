"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLimits } from "@/lib/limits";
import type { OrgPlan } from "@/types/database";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";

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

  if (!title) return { error: "Введите название мероприятия" };

  // Проверяем лимит мероприятий по тарифу
  const { data: org } = await admin
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  if (org) {
    const limits = getLimits(org.plan as OrgPlan);
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

  // Генерируем уникальный код
  let join_code = generateJoinCode();
  const { data: existing } = await admin
    .from("sessions")
    .select("id")
    .eq("join_code", join_code)
    .maybeSingle();
  if (existing) join_code = generateJoinCode();

  const { data: session, error } = await admin
    .from("sessions")
    .insert({ title, organization_id: orgId, created_by: user.id, join_code })
    .select("id")
    .single();

  if (error) return { error: error.message };

  return { redirectTo: `/org/${orgSlug}/sessions/${session.id}` };
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

  // При активации сессии — сбрасываем все активные опросы (один за раз)
  if (status === "ended") {
    await admin
      .from("polls")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("status", "active");
  }

  revalidatePath(`/org/${orgSlug}/sessions/${sessionId}`);
}
