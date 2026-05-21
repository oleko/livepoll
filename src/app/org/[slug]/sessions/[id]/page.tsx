import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SessionControls } from "./SessionControls";
import { PollList } from "./PollList";
import { NewPollForm } from "./NewPollForm";
import { QAPanel } from "./QAPanel";
import type { Session } from "@/types/database";

const STATUS_LABEL: Record<Session["status"], string> = {
  draft:  "Черновик",
  active: "Идёт",
  ended:  "Завершено",
};

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
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, join_code, status, organization_id")
    .eq("id", id)
    .single();

  if (!session) redirect(`/org/${slug}`);

  const { data: polls } = await admin
    .from("polls")
    .select("id, title, type, status, sort_order, options")
    .eq("session_id", id)
    .order("sort_order");

  const { data: voteCounts } = await admin
    .from("votes")
    .select("poll_id")
    .in("poll_id", polls?.map((p) => p.id) ?? []);

  const votesByPoll = (voteCounts ?? []).reduce<Record<string, number>>((acc, v) => {
    acc[v.poll_id] = (acc[v.poll_id] ?? 0) + 1;
    return acc;
  }, {});

  const { data: questions } = await admin
    .from("questions")
    .select("id, text, status, upvotes, created_at")
    .eq("session_id", id)
    .order("upvotes", { ascending: false });

  const hasQA = polls?.some((p) => p.type === "qa") ?? false;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const joinUrl = `${baseUrl}/join/${session.join_code}`;
  const displayUrl = `${baseUrl}/display/${session.join_code}`;

  return (
    <div>
      {/* Session header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href={`/org/${slug}`} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm">
              ← Мероприятия
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{session.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[session.status]}`}>
              {STATUS_LABEL[session.status]}
            </span>
            <span className="text-sm text-slate-400 dark:text-slate-500">
              Код: <span className="font-mono text-slate-600 dark:text-slate-300 text-base tracking-widest">{session.join_code}</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={displayUrl} target="_blank">
            <Button variant="secondary" className="text-sm">Экран</Button>
          </Link>
          <Link href={joinUrl} target="_blank">
            <Button variant="ghost" className="text-sm">Открыть как участник</Button>
          </Link>
          <SessionControls
            sessionId={session.id}
            status={session.status}
            orgSlug={slug}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Poll list */}
        <div className="lg:col-span-2">
          <PollList
            polls={polls ?? []}
            votesByPoll={votesByPoll}
            sessionId={id}
            orgSlug={slug}
            sessionStatus={session.status}
          />
        </div>

        <div className="flex flex-col gap-6">
          {/* Q&A panel */}
          {hasQA && (
            <QAPanel
              sessionId={id}
              orgSlug={slug}
              initialQuestions={questions ?? []}
            />
          )}

          {/* New poll form */}
          {session.status !== "ended" && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Добавить опрос</h2>
              <NewPollForm sessionId={id} orgSlug={slug} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
