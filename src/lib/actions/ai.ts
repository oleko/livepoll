"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";

const YANDEX_API_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

async function callYandex(systemText: string, userText: string, maxTokens = "800"): Promise<string | null> {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) return null;
  try {
    const res = await fetch(YANDEX_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Api-Key ${apiKey}` },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt-lite/latest`,
        completionOptions: { stream: false, temperature: 0.4, maxTokens },
        messages: [{ role: "system", text: systemText }, { role: "user", text: userText }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { result?: { alternatives?: { message?: { text?: string } }[] } };
    return data.result?.alternatives?.[0]?.message?.text?.trim() ?? null;
  } catch { return null; }
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Множественный выбор",
  temperature: "Шкала температуры",
  qa: "Q&A",
  idea_wall: "Стена идей",
  like_dislike: "Лайк/Дизлайк",
  word_cloud: "Облако слов",
  emoji_cloud: "Облако эмодзи",
  planning_poker: "Planning Poker",
};

export async function generateSessionSummary(
  sessionId: string
): Promise<{ summary?: string; error?: string }> {
  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) return { error: "AI не настроен" };

  // Load session
  const { data: session } = await admin
    .from("sessions")
    .select("title, ended_at")
    .eq("id", sessionId)
    .single();

  // Load polls + votes
  const { data: polls } = await admin
    .from("polls")
    .select("id, title, type, options")
    .eq("session_id", sessionId)
    .eq("status", "closed")
    .order("sort_order");

  const { data: votes } = await admin
    .from("votes")
    .select("poll_id, value")
    .in("poll_id", (polls ?? []).map((p) => p.id));

  // Load Q&A + idea_wall questions
  const { data: questions } = await admin
    .from("questions")
    .select("text, upvotes, status")
    .eq("session_id", sessionId)
    .neq("status", "hidden")
    .order("upvotes", { ascending: false })
    .limit(20);

  // Build prompt
  const lines: string[] = [
    `Мероприятие: «${session?.title ?? "Без названия"}»`,
    "",
    "Результаты опросов:",
  ];

  for (const poll of polls ?? []) {
    const pollVotes = (votes ?? []).filter((v) => v.poll_id === poll.id);
    const total = pollVotes.length;
    lines.push(`\n— «${poll.title}» (${TYPE_LABEL[poll.type] ?? poll.type}), голосов: ${total}`);

    if (total === 0) continue;

    if (poll.type === "temperature") {
      const sum = pollVotes.reduce((s, v) => s + parseFloat(v.value), 0);
      lines.push(`  Среднее: ${(sum / total).toFixed(1)} / 10`);
    } else if (poll.type === "like_dislike") {
      const likes = pollVotes.filter((v) => v.value === "like" || v.value === "👍").length;
      lines.push(`  👍 ${likes} / 👎 ${total - likes}`);
    } else if (poll.type === "multiple_choice" || poll.type === "planning_poker") {
      const counts: Record<string, number> = {};
      pollVotes.forEach((v) => { counts[v.value] = (counts[v.value] ?? 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
      sorted.forEach(([opt, c]) => lines.push(`  ${opt}: ${c} (${Math.round((c / total) * 100)}%)`));
    } else if (poll.type === "word_cloud" || poll.type === "idea_wall") {
      const top = [...(questions ?? [])]
        .filter((q) => q.status !== "hidden")
        .slice(0, 5)
        .map((q) => `«${q.text}»`)
        .join(", ");
      if (top) lines.push(`  Топ идей/слов: ${top}`);
    }
  }

  if ((questions ?? []).length > 0 && (polls ?? []).some((p) => p.type === "qa")) {
    lines.push("\nТоп вопросов из Q&A:");
    (questions ?? [])
      .filter((q) => q.status !== "hidden")
      .slice(0, 5)
      .forEach((q) => lines.push(`  ▲${q.upvotes} — «${q.text}»`));
  }

  const promptText = lines.join("\n");
  const summary = await callYandex(
    "Ты аналитик мероприятия. Составь краткое резюме итогов на русском языке. Пиши профессионально, без воды, без повторений данных дословно.",
    `${promptText}\n\nСоставь краткое резюме мероприятия в 3–5 предложениях: что обсуждалось, какие ключевые результаты, что показали голосования и вопросы аудитории. Выдели самое важное.`,
    "600"
  );

  if (!summary) return { error: "Не удалось получить ответ от AI" };
  return { summary };
}

export async function summarizeQuestions(texts: string[]): Promise<{ summary?: string; error?: string }> {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!apiKey || !folderId) {
    return { error: "AI не настроен (отсутствуют YANDEX_API_KEY / YANDEX_FOLDER_ID)" };
  }

  if (texts.length === 0) {
    return { error: "Нет вопросов для анализа" };
  }

  const questionList = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const body = {
    modelUri: `gpt://${folderId}/yandexgpt-lite/latest`,
    completionOptions: {
      stream: false,
      temperature: 0.3,
      maxTokens: "800",
    },
    messages: [
      {
        role: "system",
        text: "Ты аналитик мероприятия. Твоя задача — кратко проанализировать вопросы аудитории и выделить ключевые темы. Отвечай строго на русском языке.",
      },
      {
        role: "user",
        text: `Вот вопросы от аудитории:\n\n${questionList}\n\nВыдели 3 ключевых тренда или темы. Формат: пронумерованный список, каждый пункт — короткое название темы (жирным) и одно предложение объяснения.`,
      },
    ],
  };

  try {
    const res = await fetch(YANDEX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Api-Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Yandex AI error:", res.status, err);
      return { error: "Ошибка AI-сервиса. Попробуйте позже." };
    }

    const data = await res.json() as {
      result?: { alternatives?: { message?: { text?: string } }[] };
    };

    const summary = data.result?.alternatives?.[0]?.message?.text;
    if (!summary) return { error: "Пустой ответ от AI" };

    return { summary };
  } catch (e) {
    console.error("Yandex AI fetch error:", e);
    return { error: "Не удалось подключиться к AI" };
  }
}
