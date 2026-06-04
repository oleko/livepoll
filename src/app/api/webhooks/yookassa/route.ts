import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchYookassaPayment } from "@/lib/yookassa";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const notification = body as {
    type?: string;
    event?: string;
    object?: { id?: string };
  };

  if (notification.type !== "notification") {
    return NextResponse.json({ ok: true });
  }

  const paymentId = notification.object?.id;
  const event = notification.event;
  if (!paymentId) return NextResponse.json({ ok: true });

  // Re-fetch from YooKassa to verify — prevents spoofed webhooks
  const payment = await fetchYookassaPayment(paymentId);
  if (!payment) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  if (event === "payment.succeeded" && payment.status === "succeeded") {
    const { order_id, org_id, plan } = payment.metadata ?? {};

    if (order_id && org_id && plan) {
      await admin
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order_id);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await admin
        .from("organizations")
        .update({ plan, plan_expires_at: expiresAt.toISOString() } as never)
        .eq("id", org_id);
    }
  } else if (event === "payment.cancelled") {
    const { order_id } = payment.metadata ?? {};
    if (order_id) {
      await admin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order_id);
    }
  }

  return NextResponse.json({ ok: true });
}
