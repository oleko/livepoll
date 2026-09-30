import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness in one. The deploy workflow and any uptime monitor can
 * hit this instead of the landing page: "/" renders fine while the database is
 * unreachable, so it cannot tell a working release from a broken one.
 *
 * Returns 503 when the database does not answer, so a failing deploy is caught
 * by the health check rather than by whoever runs the next event.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { status: "degraded", db: "error", detail: error.message, ms: Date.now() - startedAt },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { status: "ok", db: "ok", ms: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { status: "down", detail: (err as Error).message, ms: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
