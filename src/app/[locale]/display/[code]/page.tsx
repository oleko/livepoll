import { createAdminClient } from "@/lib/supabase/admin";
import { DisplayScreen } from "./DisplayScreen";
import type { BrandingSettings } from "@/lib/actions/branding";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, status, join_code, organization_id, total_attendees, settings, mode")
    .eq("join_code", code.toUpperCase())
    .single();
  const totalAttendees = (session as unknown as { total_attendees?: number })?.total_attendees ?? 0;
  // session.mode is the source of truth for whether this is a quiz session
  // (backfilled from settings.championship.enabled by migration 014);
  // auto/reveal_duration remain settings-only, mode doesn't carry them.
  type SessionSettings = { championship?: { enabled?: boolean; auto?: boolean; reveal_duration?: number } };
  const sessionSettings = (session as unknown as { settings?: SessionSettings })?.settings ?? {};
  const championship = {
    ...sessionSettings.championship,
    enabled: (session as unknown as { mode?: string })?.mode === "quiz",
  };

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-xl">Мероприятие не найдено</p>
      </main>
    );
  }

  const { data: org } = session
    ? await admin.from("organizations").select("slug, settings").eq("id", session.organization_id).single()
    : { data: null };
  const branding = (org?.settings as BrandingSettings | null) ?? {};

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

  const questionsQuery = admin
    .from("questions")
    .select("id, text, status, upvotes, poll_id")
    .neq("status", "hidden")
    .order("upvotes", { ascending: false });
  if (activePoll?.type === "qa" || activePoll?.type === "idea_wall") {
    questionsQuery.eq("poll_id", activePoll.id);
  } else {
    questionsQuery.eq("session_id", session.id);
  }
  const { data: initialQuestionsData } = await questionsQuery;

  // Count unique voters across all session polls
  const { data: sessionPolls } = await admin
    .from("polls")
    .select("id")
    .eq("session_id", session.id);
  const pollIds = (sessionPolls ?? []).map((p) => p.id);
  let initialJoinedCount = 0;
  if (pollIds.length > 0) {
    const { data: voterRows } = await admin
      .from("votes")
      .select("voter_token")
      .in("poll_id", pollIds);
    initialJoinedCount = new Set((voterRows ?? []).map((v) => v.voter_token)).size;
  }

  // Championship: load initial participant names for lobby
  let initialChampParticipants: string[] = [];
  if (championship.enabled) {
    const { data: pRows } = await admin
      .from("participants" as never)
      .select("name")
      .eq("session_id", session.id);
    initialChampParticipants = ((pRows ?? []) as { name: string }[]).map((r) => r.name);
  }

  // Active slide
  const activeSlideId = (session as unknown as { active_slide_id?: string | null })?.active_slide_id;
  let initialActiveSlide = null;
  if (activeSlideId) {
    const { data: slideData } = await admin
      .from("session_slides")
      .select("id, type, content")
      .eq("id", activeSlideId)
      .single();
    initialActiveSlide = slideData ?? null;
  }

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
      totalAttendees={totalAttendees}
      initialJoinedCount={initialJoinedCount}
      branding={branding}
      initialActiveSlide={initialActiveSlide}
      championship={championship}
      initialChampParticipants={initialChampParticipants}
    />
  );
}
