const RESEND_API_URL = "https://api.resend.com/emails";

const TYPE_LABEL: Record<string, string> = {
  bug:      "🐛 Баг",
  idea:     "💡 Идея",
  question: "❓ Вопрос",
};

export async function sendFeedbackEmail({
  type,
  text,
  userEmail,
  pageUrl,
}: {
  type: string;
  text: string;
  userEmail: string | null;
  pageUrl: string;
}) {
  const apiKey = process.env.RESEND_EMAIL_API_KEY;
  if (!apiKey) return; // молча пропускаем если ключ не настроен

  const typeLabel = TYPE_LABEL[type] ?? type;
  const from = userEmail ?? "аноним";
  const subject = `[LivePoll] ${typeLabel} от ${from}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 16px; font-size: 18px; color: #1e293b;">
        Новое обращение в LivePoll AI
      </h2>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Тип</p>
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${typeLabel}</p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Сообщение</p>
        <p style="margin: 0; font-size: 15px; color: #1e293b; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(text)}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8; width: 100px;">От</td>
          <td style="padding: 6px 0; color: #334155;">
            ${userEmail
              ? `<a href="mailto:${userEmail}" style="color: #4f46e5;">${userEmail}</a>`
              : "не авторизован"}
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Страница</td>
          <td style="padding: 6px 0; color: #334155; font-family: monospace; font-size: 12px;">${escapeHtml(pageUrl)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Время</td>
          <td style="padding: 6px 0; color: #334155;">${new Date().toLocaleString("ru-RU")}</td>
        </tr>
      </table>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        Все обращения: <a href="https://kvoroom.ru/admin/feedback" style="color: #4f46e5;">kvoroom.ru/admin/feedback</a>
      </p>
    </div>
  `;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "LivePoll AI <noreply@livepoll.ru>",
        to: ["oleko85@gmail.com"],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] resend error:", res.status, err);
    }
  } catch (err) {
    console.error("[email] network error:", (err as Error).message);
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
