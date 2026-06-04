"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, assertOrgOwner } from "@/lib/actions/guards";
import { createYookassaPayment, isYookassaConfigured } from "@/lib/yookassa";

export const PLAN_PRICES: Record<string, { kopecks: number; rubles: number }> = {
  starter: { kopecks: 49000,  rubles: 490  },
  pro:     { kopecks: 99000,  rubles: 990  },
  team:    { kopecks: 249000, rubles: 2490 },
};

export async function createUpgradeOrder(
  orgId: string,
  plan: string,
  orgSlug: string
): Promise<{ redirect?: string; manual?: boolean; error?: string }> {
  const { user, admin } = await getAuthUser();
  await assertOrgOwner(user.id, orgId, admin);

  const price = PLAN_PRICES[plan];
  if (!price) return { error: "Неверный тариф" };

  const { data: order, error } = await admin
    .from("orders")
    .insert({ org_id: orgId, plan, amount_kopecks: price.kopecks, status: "pending" })
    .select("id")
    .single();

  if (error || !order) return { error: "Ошибка создания заказа" };

  if (isYookassaConfigured()) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const payment = await createYookassaPayment({
      amount: price.rubles,
      orderId: order.id,
      orgId,
      plan,
      returnUrl: `${baseUrl}/org/${orgSlug}/settings?order=${order.id}`,
    });

    if (payment) {
      await admin
        .from("orders")
        .update({ payment_id: payment.id, payment_url: payment.confirmation_url })
        .eq("id", order.id);

      return { redirect: payment.confirmation_url };
    }
  }

  return { manual: true };
}
