/**
 * Harness for the live QA run: seeds a throwaway event straight through the
 * service-role key, so Playwright can drive the participant and projector
 * screens without a host login.
 *
 * It writes and deletes rows, which is why the first thing it does is refuse
 * to point at production. That safeguard is deliberate: the only difference
 * between seeding a test session and deleting a customer's event is which
 * project the key belongs to.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/** The production project ref. The harness must never touch it. */
const PRODUCTION_REF = "ikucuostgfsmetztzzup";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

export function stagingConfig() {
  const file = loadEnvFile(".env.staging");
  const url =
    process.env.STAGING_SUPABASE_URL ?? file.NEXT_PUBLIC_SUPABASE_URL ?? file.STAGING_SUPABASE_URL;
  const serviceKey =
    process.env.STAGING_SERVICE_ROLE_KEY ?? file.SUPABASE_SERVICE_ROLE_KEY ?? file.STAGING_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Нет доступа к staging. Создайте .env.staging с NEXT_PUBLIC_SUPABASE_URL, " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY от ОТДЕЛЬНОГО проекта Supabase."
    );
  }
  if (url.includes(PRODUCTION_REF)) {
    throw new Error(
      "ОТКАЗ: " + url + " — это боевой проект. Стенд пишет и удаляет данные, подставьте staging."
    );
  }
  return { url, serviceKey, anonKey: file.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

export function stagingAdmin() {
  const { url, serviceKey } = stagingConfig();
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** Every row the harness creates carries this marker, so teardown stays exact. */
export const QA_MARKER = "[QA]";

const POLL_TYPES = [
  { type: "multiple_choice", title: QA_MARKER + " Множественный выбор", options: ["Альфа", "Бета", "Гамма"] },
  { type: "word_cloud", title: QA_MARKER + " Облако слов", options: [] },
  { type: "emoji_cloud", title: QA_MARKER + " Облако эмодзи", options: [] },
  { type: "temperature", title: QA_MARKER + " Шкала температуры", options: [] },
  { type: "like_dislike", title: QA_MARKER + " Лайк и дизлайк", options: [] },
  { type: "planning_poker", title: QA_MARKER + " Planning Poker", options: [] },
  { type: "qa", title: QA_MARKER + " Вопросы аудитории", options: [] },
  { type: "idea_wall", title: QA_MARKER + " Стена идей", options: [] },
];

const SLIDES = [
  { type: "splash", content: { title: QA_MARKER + " Заставка", date: "2026-10-01" } },
  { type: "speaker", content: { name: QA_MARKER + " Спикер", role: "Докладчик" } },
  { type: "schedule", content: { title: QA_MARKER + " Расписание", items: [{ time: "10:00", title: "Открытие" }] } },
  { type: "quote", content: { text: QA_MARKER + " Цитата", author: "Автор" } },
  { type: "final", content: { title: QA_MARKER + " Спасибо" } },
  { type: "spin_wheel", content: { title: QA_MARKER + " Колесо", options: ["Один", "Два", "Три"] } },
  { type: "announcement", content: { text: QA_MARKER + " Объявление", duration: 15 } },
  { type: "reveal", content: { question: QA_MARKER + " Вопрос", answer: "Ответ" } },
];

function joinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * Builds a full event: user, org, membership, session, one poll of every
 * registered type and one slide of every registered type.
 */
export async function seed(admin) {
  const stamp = Date.now();

  const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
    email: "qa-" + stamp + "@example.invalid",
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: QA_MARKER + " Хост" },
  });
  if (userErr) throw new Error("createUser: " + userErr.message);
  const userId = userRes.user.id;

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: QA_MARKER + " Орг " + stamp, slug: "qa-" + stamp, plan: "unlimited" })
    .select("id, slug")
    .single();
  if (orgErr) throw new Error("organizations: " + orgErr.message);

  const { error: memErr } = await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });
  if (memErr) throw new Error("organization_members: " + memErr.message);

  const { data: session, error: sessErr } = await admin
    .from("sessions")
    .insert({
      organization_id: org.id,
      created_by: userId,
      title: QA_MARKER + " Прогон " + stamp,
      join_code: joinCode(),
      status: "active",
      mode: "conference",
      settings: {},
    })
    .select("id, join_code")
    .single();
  if (sessErr) throw new Error("sessions: " + sessErr.message);

  const { data: polls, error: pollErr } = await admin
    .from("polls")
    .insert(
      POLL_TYPES.map((p, i) => ({
        session_id: session.id,
        created_by: userId,
        title: p.title,
        type: p.type,
        options: p.options,
        status: "draft",
        sort_order: i,
        settings: {},
      }))
    )
    .select("id, type");
  if (pollErr) throw new Error("polls: " + pollErr.message);

  const { data: slides, error: slideErr } = await admin
    .from("session_slides")
    .insert(
      SLIDES.map((s, i) => ({
        session_id: session.id,
        type: s.type,
        content: s.content,
        sort_order: 100 + i,
      }))
    )
    .select("id, type");
  if (slideErr) throw new Error("session_slides: " + slideErr.message);

  return {
    userId,
    orgId: org.id,
    orgSlug: org.slug,
    sessionId: session.id,
    joinCode: session.join_code,
    polls: Object.fromEntries(polls.map((p) => [p.type, p.id])),
    slides: Object.fromEntries(slides.map((s) => [s.type, s.id])),
  };
}

/**
 * Host actions applied directly instead of through the UI.
 *
 * Note this does NOT broadcast: the point is to verify that a screen which
 * missed the broadcast still converges through the resync path, which is the
 * failure mode the whole August backlog was about.
 */
export async function activatePoll(admin, sessionId, pollId, settings = {}) {
  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("status", "active");
  await admin.from("sessions").update({ active_slide_id: null }).eq("id", sessionId);
  const { error } = await admin
    .from("polls")
    .update({ status: "active", settings: { ...settings, activated_at: new Date().toISOString() } })
    .eq("id", pollId);
  if (error) throw new Error("activatePoll: " + error.message);
}

export async function closePoll(admin, pollId) {
  const { error } = await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", pollId);
  if (error) throw new Error("closePoll: " + error.message);
}

export async function showSlide(admin, sessionId, slideId) {
  await admin
    .from("polls")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("status", "active");
  const { error } = await admin.from("sessions").update({ active_slide_id: slideId }).eq("id", sessionId);
  if (error) throw new Error("showSlide: " + error.message);
}

export async function countVotes(admin, pollId) {
  const { count } = await admin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", pollId);
  return count ?? 0;
}

export async function countQuestions(admin, pollId) {
  const { count } = await admin
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", pollId);
  return count ?? 0;
}

/** Removes everything seed() created. Cascades handle polls, votes, questions. */
export async function teardown(admin, fixture) {
  if (!fixture) return;
  await admin.from("sessions").update({ active_slide_id: null }).eq("id", fixture.sessionId);
  await admin.from("sessions").delete().eq("id", fixture.sessionId);
  await admin.from("organizations").delete().eq("id", fixture.orgId);
  if (fixture.userId) {
    try {
      await admin.auth.admin.deleteUser(fixture.userId);
    } catch {
      // The org and session are gone; a stray auth user is harmless on staging.
    }
  }
}
