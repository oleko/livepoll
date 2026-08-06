/**
 * The one YandexGPT Lite client. Was copy-pasted three times (session
 * summary, Q&A theme summary, farewell message) — one instance kept a
 * shared helper but two callers didn't use it, and sessions.ts had its own
 * standalone copy.
 */

const YANDEX_API_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

export type YandexOptions = {
  temperature?: number;
  maxTokens?: string;
};

export async function callYandex(
  systemText: string,
  userText: string,
  opts: YandexOptions = {}
): Promise<string | null> {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) return null;

  try {
    const res = await fetch(YANDEX_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Api-Key ${apiKey}` },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt-lite/latest`,
        completionOptions: {
          stream: false,
          temperature: opts.temperature ?? 0.4,
          maxTokens: opts.maxTokens ?? "800",
        },
        messages: [
          { role: "system", text: systemText },
          { role: "user", text: userText },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { result?: { alternatives?: { message?: { text?: string } }[] } };
    return data.result?.alternatives?.[0]?.message?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

/** True when YANDEX_API_KEY / YANDEX_FOLDER_ID are configured. */
export function yandexConfigured(): boolean {
  return !!process.env.YANDEX_API_KEY && !!process.env.YANDEX_FOLDER_ID;
}
