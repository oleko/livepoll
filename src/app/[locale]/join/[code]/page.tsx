import { createAdminClient } from "@/lib/supabase/admin";
import { VoteInterface } from "./VoteInterface";
import type { BrandingSettings } from "@/lib/actions/branding";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getTranslations } from "next-intl/server";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code } = await params;
  const t = await getTranslations("Join");
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, status, organization_id, active_slide_id")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 pb-16">
        <div className="text-center">
          <p className="text-2xl text-slate-500 dark:text-slate-400">{t("notFound")}</p>
          <p className="text-slate-400 dark:text-slate-600 mt-2">{t("notFoundHint")}</p>
        </div>
      </main>
    );
  }

  if (session.status === "ended") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 pb-16">
        <div className="text-center">
          <p className="text-2xl text-slate-500 dark:text-slate-400">{t("ended")}</p>
          <p className="text-slate-400 dark:text-slate-600 mt-2">{t("endedThanks")}</p>
        </div>
      </main>
    );
  }

  const { data: org } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", (session as unknown as { organization_id: string }).organization_id)
    .single();
  const branding = (org?.settings as BrandingSettings | null) ?? {};
  const whiteLabel = !!branding.white_label;

  const sessionExt = session as unknown as { id: string; title: string; status: string; organization_id: string; active_slide_id?: string };
  let initialActiveSlide: { type: string; content: Record<string, unknown> } | null = null;
  if (sessionExt.active_slide_id) {
    const { data: activeSlide } = await admin
      .from("session_slides")
      .select("id, type, content")
      .eq("id", sessionExt.active_slide_id)
      .single();
    if (activeSlide) initialActiveSlide = activeSlide as { type: string; content: Record<string, unknown> };
  }

  const { data: activePoll } = await admin
    .from("polls")
    .select("id, title, type, options, status, settings")
    .eq("session_id", session.id)
    .eq("status", "active")
    .maybeSingle();

  const initialQuestions = activePoll?.type === "qa"
    ? (await admin
        .from("questions")
        .select("id, text, status, upvotes, poll_id")
        .eq("poll_id", activePoll.id)
        .neq("status", "hidden")
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false })
      ).data ?? []
    : [];

  const tCommon = await getTranslations("Common");

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-center relative">
        {branding.logo_url ? (
          <img
            src={branding.logo_url}
            alt={t("logoAlt")}
            className="h-8 max-w-[160px] object-contain"
          />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{session.title}</p>
        )}
        <div className="absolute right-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <VoteInterface
          sessionId={session.id}
          joinCode={code.toUpperCase()}
          initialPoll={activePoll}
          sessionStatus={session.status}
          initialQuestions={initialQuestions}
          initialActiveSlide={initialActiveSlide}
        />
      </div>

      {!whiteLabel && (
        <footer className="py-3 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-500 transition-colors"
          >
            {tCommon("poweredBy")}
          </Link>
        </footer>
      )}
    </main>
  );
}
