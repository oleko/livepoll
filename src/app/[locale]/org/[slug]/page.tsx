import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
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

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, plan")
    .eq("slug", slug)
    .single();

  if (!org) redirect("/onboarding");

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, join_code, status, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  const activeSessions = sessions?.filter((s) => s.status === "active").length ?? 0;
  const sessionIds = (sessions ?? []).map((s) => s.id);

  // Poll counts per session
  const { data: pollRows } = sessionIds.length > 0
    ? await admin.from("polls").select("session_id").in("session_id", sessionIds)
    : { data: [] };
  const pollCountBySession: Record<string, number> = {};
  (pollRows ?? []).forEach((r) => {
    pollCountBySession[r.session_id] = (pollCountBySession[r.session_id] ?? 0) + 1;
  });

  // Unique participant counts per session (unique voter tokens across polls)
  const { data: voteRows } = sessionIds.length > 0
    ? await admin
        .from("votes")
        .select("voter_token, polls!inner(session_id)")
        .in("polls.session_id", sessionIds)
    : { data: [] };
  const participantsBySession: Record<string, Set<string>> = {};
  (voteRows ?? []).forEach((r) => {
    const sid = (r as unknown as { polls: { session_id: string } }).polls.session_id;
    if (!participantsBySession[sid]) participantsBySession[sid] = new Set();
    participantsBySession[sid].add(r.voter_token);
  });
  const participantCountBySession: Record<string, number> = {};
  Object.entries(participantsBySession).forEach(([sid, set]) => {
    participantCountBySession[sid] = set.size;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Мероприятия</h1>
          {activeSessions > 0 && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {activeSessions} активных сейчас
            </p>
          )}
        </div>
        <Link href={`/org/${slug}/sessions/new`}>
          <Button>+ Новое мероприятие</Button>
        </Link>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-16 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">Нет мероприятий</p>
          <p className="text-slate-400 dark:text-slate-600 text-sm mb-6">
            Создайте первое мероприятие чтобы начать принимать голоса
          </p>
          <Link href={`/org/${slug}/sessions/new`}>
            <Button>Создать мероприятие</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/org/${slug}/sessions/${session.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{session.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      {new Date(session.created_at).toLocaleDateString("ru-RU")}
                    </p>
                    {(pollCountBySession[session.id] ?? 0) > 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        📊 {pollCountBySession[session.id]}
                      </span>
                    )}
                    {(participantCountBySession[session.id] ?? 0) > 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        👥 {participantCountBySession[session.id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[session.status]}`}>
                {STATUS_LABEL[session.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
