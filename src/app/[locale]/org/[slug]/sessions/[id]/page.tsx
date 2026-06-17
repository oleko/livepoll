import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SessionControls } from "./SessionControls";
import { PollList } from "./PollList";
import { QAPanel } from "./QAPanel";
import { CreationTabs } from "./CreationTabs";
import { SessionConnectPanel } from "./SessionConnectPanel";
import { AttendeesInput } from "./AttendeesInput";
import { ExportButton } from "./ExportButton";
import { SessionSummaryButton } from "./SessionSummaryButton";
import type { Session } from "@/types/database";

const STATUS_COLOR: Record<Session["status"], string> = {
  draft:  "text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800",
  active: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/10",
  ended:  "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800",
};

export default async function SessionPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const t = await getTranslations();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, join_code, status, organization_id, total_attendees")
    .eq("id", id)
    .single();
  const totalAttendees = (session as unknown as { total_attendees?: number })?.total_attendees ?? 0;

  if (!session) redirect(`/org/${slug}`);

  const { data: polls } = await admin
    .from("polls")
    .select("id, title, type, status, sort_order, section_id, options, created_at, settings")
    .eq("session_id", id)
    .order("sort_order");

  const { data: sections } = await admin
    .from("session_sections")
    .select("id, title, sort_order")
    .eq("session_id", id)
    .order("sort_order");

  const { data: voteRows } = await admin
    .from("votes")
    .select("poll_id, value, created_at")
    .in("poll_id", polls?.map((p) => p.id) ?? []);

  const votesByPoll = (voteRows ?? []).reduce<Record<string, number>>((acc, v) => {
    acc[v.poll_id] = (acc[v.poll_id] ?? 0) + 1;
    return acc;
  }, {});

  const votesDataByPoll = (voteRows ?? []).reduce<Record<string, Record<string, number>>>(
    (acc, v) => {
      if (!acc[v.poll_id]) acc[v.poll_id] = {};
      let vals: string[];
      try { vals = v.value.startsWith("[") ? (JSON.parse(v.value) as string[]) : [v.value]; }
      catch { vals = [v.value]; }
      vals.forEach((val) => { acc[v.poll_id][val] = (acc[v.poll_id][val] ?? 0) + 1; });
      return acc;
    },
    {}
  );

  const votesTimelineByPoll = (voteRows ?? []).reduce<Record<string, string[]>>(
    (acc, v) => {
      if (!acc[v.poll_id]) acc[v.poll_id] = [];
      acc[v.poll_id].push(v.created_at);
      return acc;
    },
    {}
  );

  const { data: questions } = await admin
    .from("questions")
    .select("id, text, status, upvotes, created_at")
    .eq("session_id", id)
    .order("upvotes", { ascending: false });

  const hasQA = polls?.some((p) => p.type === "qa" || p.type === "idea_wall") ?? false;

  const { data: slides } = await admin
    .from("session_slides")
    .select("id, session_id, type, content, sort_order, section_id, created_at")
    .eq("session_id", id)
    .order("sort_order");

  const activeSlideId = (session as unknown as { active_slide_id?: string | null })?.active_slide_id ?? null;

  const { data: otherSessions } = await admin
    .from("sessions")
    .select("id, title, status")
    .eq("organization_id", session.organization_id)
    .neq("id", id)
    .in("status", ["draft", "active"])
    .order("created_at", { ascending: false })
    .limit(20);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const joinUrl = `${baseUrl}/join/${session.join_code}`;
  const displayUrl = `${baseUrl}/display/${session.join_code}`;
  const presenterUrl = `${baseUrl}/display/${session.join_code}/presenter`;

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <Link
            href={`/org/${slug}`}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-fit"
          >
            {t("Org.session.page.backLink")}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
            {session.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap mt-0.5">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[session.status]}`}>
              {t(`Org.shared.sessionStatus.${session.status}`)}
            </span>
            {session.status !== "ended" && (
              <AttendeesInput
                sessionId={session.id}
                orgSlug={slug}
                initial={totalAttendees}
              />
            )}
          </div>
        </div>

        {/* Primary actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {(session.status === "active" || session.status === "ended") && (polls?.length ?? 0) > 0 && (
            <SessionSummaryButton sessionId={id} />
          )}
          {(polls?.length ?? 0) > 0 && (
            <ExportButton
              session={{ title: session.title, join_code: session.join_code }}
              polls={(polls ?? []).map((p) => ({
                id: p.id,
                title: p.title,
                type: p.type,
                options: Array.isArray(p.options) ? (p.options as string[]) : [],
                section_id: (p as unknown as { section_id?: string | null }).section_id ?? null,
              }))}
              sections={sections ?? []}
              votesByPoll={votesByPoll}
              votesDataByPoll={votesDataByPoll}
              questions={(questions ?? []).map((q) => ({ text: q.text, status: q.status }))}
            />
          )}
          <SessionControls sessionId={session.id} status={session.status} orgSlug={slug} />
        </div>
      </div>

      {/* ── 2. Share & Screens ───────────────────────────────────────────────── */}
      {session.status !== "ended" && (
        <SessionConnectPanel
          joinUrl={joinUrl}
          joinCode={session.join_code}
          displayUrl={displayUrl}
          presenterUrl={presenterUrl}
        />
      )}

      {/* ── 3 & 4. Lineup + Creation ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 3. Poll & slide lineup */}
        <div className="lg:col-span-2">
          <PollList
            polls={(polls ?? []).map((p) => ({
              ...p,
              section_id: (p as unknown as { section_id?: string | null }).section_id ?? null,
            }))}
            slides={(slides ?? []) as unknown as import("@/lib/actions/slides").SlideRow[]}
            activeSlideId={activeSlideId}
            votesByPoll={votesByPoll}
            votesDataByPoll={votesDataByPoll}
            votesTimelineByPoll={votesTimelineByPoll}
            sessionId={id}
            orgSlug={slug}
            sessionStatus={session.status}
            copyTargets={otherSessions ?? []}
            sections={sections ?? []}
          />
        </div>

        {/* 4. Creation & moderation */}
        <div className="flex flex-col gap-6">
          {session.status !== "ended" && (
            <CreationTabs sessionId={id} orgSlug={slug} sections={sections ?? []} />
          )}
          {hasQA && (
            <QAPanel sessionId={id} orgSlug={slug} initialQuestions={questions ?? []} />
          )}
        </div>
      </div>

    </div>
  );
}
