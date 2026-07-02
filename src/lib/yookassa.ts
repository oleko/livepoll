import { PLAN_DISPLAY_NAME } from "@/lib/limits";

const BASE_URL = "https://api.yookassa.ru/v3";

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID ?? "";
  const secret = process.env.YOOKASSA_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${shopId}:${secret}`).toString("base64");
}

export function isYookassaConfigured(): boolean {
  return !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

export async function createYookassaPayment({
  amount,
  orderId,
  orgId,
  plan,
  returnUrl,
}: {
  amount: number; // rubles
  orderId: string;
  orgId: string;
  plan: string;
  returnUrl: string;
}): Promise<{ id: string; confirmation_url: string } | null> {
  if (!isYookassaConfigured()) return null;

  try {
    const res = await fetch(`${BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader(),
        "Idempotence-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        amount: { value: amount.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: returnUrl },
        description: `Kvoroom — тариф «${PLAN_DISPLAY_NAME[plan as keyof typeof PLAN_DISPLAY_NAME] ?? plan}» (1 месяц)`,
        metadata: { order_id: orderId, org_id: orgId, plan },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      id: string;
      confirmation: { confirmation_url: string };
    };

    return { id: data.id, confirmation_url: data.confirmation.confirmation_url };
  } catch {
    return null;
  }
}

export async function fetchYookassaPayment(paymentId: string): Promise<{
  id: string;
  status: string;
  metadata?: Record<string, string>;
} | null> {
  if (!isYookassaConfigured()) return null;

  try {
    const res = await fetch(`${BASE_URL}/payments/${paymentId}`, {
      headers: { "Authorization": authHeader() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json() as { id: string; status: string; metadata?: Record<string, string> };
  } catch {
    return null;
  }
}
