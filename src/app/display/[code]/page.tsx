import { createAdminClient } from "@/lib/supabase/admin";
import { DisplayScreen } from "./DisplayScreen";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, status, join_code")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-xl">Мероприятие не найдено</p>
      </main>
    );
  }

  const { data: activePoll } = await admin
    .from("polls")
    .select("id, title, type, options, status")
    .eq("session_id", session.id)
    .eq("status", "active")
    .maybeSingle();

  let initialVotes: { value: string }[] = [];
  if (activePoll) {
    const { data } = await admin
      .from("votes")
      .select("value")
      .eq("poll_id", activePoll.id);
    initialVotes = data ?? [];
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const joinUrl = `${baseUrl}/join/${session.join_code}`;

  return (
    <DisplayScreen
      session={session}
      initialPoll={activePoll}
      initialVotes={initialVotes}
      joinUrl={joinUrl}
    />
  );
}
