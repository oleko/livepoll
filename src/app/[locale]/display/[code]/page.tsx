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
    .select("id, title, status, join_code, organization_id, total_attendees")
    .eq("join_code", code.toUpperCase())
    .single();
  const totalAttendees = (session as unknown as { total_attendees?: number })?.total_attendees ?? 0;

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

  const { data: initialQuestionsData } = await admin
    .from("questions")
    .select("id, text, status, upvotes")
    .eq("session_id", session.id)
    .neq("status", "hidden")
    .order("upvotes", { ascending: false });

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
    />
  );
}
