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
    .select("id, title, status, join_code, organization_id")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-xl">Мероприятие не найдено</p>
      </main>
    );
  }

  const { data: org } = session
    ? await admin.from("organizations").select("slug").eq("id", session.organization_id).single()
    : { data: null };

  const { data: activePoll } = await admin
    .from("polls")
    .select("id, title, type, options, status, settings")
    .eq("session_id", session.id)
    .eq("status", "active")
    .maybeSingle();

  let initialVotes: { value: string }[] = [];
  if (activePoll && activePoll.type !== "qa") {
    const { data } = await admin
      .from("votes")
      .select("value")
      .eq("poll_id", activePoll.id);
    initialVotes = data ?? [];
  }

  const { data: initialQuestionsData } = await admin
    .from("questions")
    .select("id, text, status, upvotes")
    .eq("session_id", session.id)
    .neq("status", "hidden")
    .order("upvotes", { ascending: false });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const joinUrl = `${baseUrl}/join/${session.join_code}`;

  return (
    <DisplayScreen
      session={session}
      initialPoll={activePoll}
      initialVotes={initialVotes}
      initialQuestions={initialQuestionsData ?? []}
      joinUrl={joinUrl}
      orgSlug={org?.slug ?? ""}
    />
  );
}
