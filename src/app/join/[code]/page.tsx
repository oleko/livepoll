import { createAdminClient } from "@/lib/supabase/admin";
import { VoteInterface } from "./VoteInterface";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, status")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-2xl text-slate-500 dark:text-slate-400">Мероприятие не найдено</p>
          <p className="text-slate-400 dark:text-slate-600 mt-2">Проверьте код и попробуйте снова</p>
        </div>
      </main>
    );
  }

  if (session.status === "ended") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-2xl text-slate-500 dark:text-slate-400">Мероприятие завершено</p>
          <p className="text-slate-400 dark:text-slate-600 mt-2">Спасибо за участие!</p>
        </div>
      </main>
    );
  }

  const { data: activePoll } = await admin
    .from("polls")
    .select("id, title, type, options, status")
    .eq("session_id", session.id)
    .eq("status", "active")
    .maybeSingle();

  const initialQuestions = activePoll?.type === "qa"
    ? (await admin
        .from("questions")
        .select("id, text, status, upvotes")
        .eq("session_id", session.id)
        .neq("status", "hidden")
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false })
      ).data ?? []
    : [];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <p className="text-center text-sm text-slate-500">{session.title}</p>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <VoteInterface
          sessionId={session.id}
          joinCode={code.toUpperCase()}
          initialPoll={activePoll}
          sessionStatus={session.status}
          initialQuestions={initialQuestions}
        />
      </div>
    </main>
  );
}
