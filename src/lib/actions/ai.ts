"use server";

const YANDEX_API_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

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
      console.error("Yandex AI error:", err);
      return { error: "Ошибка AI-сервиса" };
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
