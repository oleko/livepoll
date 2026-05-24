"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type FeedbackResult = { success: true } | { error: string };

const ALLOWED_TYPES = ["bug", "idea", "question"] as const;

export async function submitFeedback(
  type: string,
  text: string,
  pageUrl: string
): Promise<FeedbackResult> {
  if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return { error: "Неверный тип" };
  }
  if (!text || text.length > 1000) {
    return { error: "Слишком длинный текст (максимум 1000 символов)" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("feedback" as never).insert({
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    type,
    text,
    page_url: pageUrl.slice(0, 500),
  } as never);

  if (error) {
    console.error("[feedback] insert error:", error.message);
    return { error: "Не удалось отправить. Попробуйте позже." };
  }

  return { success: true };
}

export async function getFeedback() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("feedback" as never)
    .select("id, type, text, user_email, page_url, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as FeedbackRow[];
}

export type FeedbackRow = {
  id: string;
  type: "bug" | "idea" | "question";
  text: string;
  user_email: string | null;
  page_url: string | null;
  created_at: string;
};
