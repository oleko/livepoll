import { createAdminClient } from "@/lib/supabase/admin";
import { PresenterScreen } from "./PresenterScreen";

export default async function PresenterPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, status, join_code, organization_id, total_attendees, active_slide_id")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-xl">Мероприятие не найдено</p>
      </main>
    );
  }

  const s = session as typeof session & { active_slide_id?: string | null };

  const [{ data: polls }, { data: slides }, { data: questions }] = await Promise.all([
    admin.from("polls").select("id, title, type, status, sort_order, options, settings").eq("session_id", s.id).order("sort_order"),
    admin.from("session_slides").select("id, type, content, sort_order").eq("session_id", s.id).order("sort_order"),
    admin.from("questions").select("id, text, upvotes, created_at").eq("session_id", s.id).neq("status", "hidden").order("upvotes", { ascending: false }).limit(5),
  ]);

  const activePoll = (polls ?? []).find(p => p.status === "active") ?? null;

  let initialVoteCounts: Record<string, number> = {};
  if (activePoll && activePoll.type !== "qa") {
    const { data: voteRows } = await admin.from("votes").select("value").eq("poll_id", activePoll.id);
    (voteRows ?? []).forEach(v => {
      try {
        const vals: string[] = v.value.startsWith("[") ? (JSON.parse(v.value) as string[]) : [v.value];
        vals.forEach(val => { initialVoteCounts[val] = (initialVoteCounts[val] ?? 0) + 1; });
      } catch {
        initialVoteCounts[v.value] = (initialVoteCounts[v.value] ?? 0) + 1;
      }
    });
  }

  const { data: voterRows } = await admin.from("votes").select("voter_token").in("poll_id", (polls ?? []).map(p => p.id));
  const initialJoinedCount = new Set((voterRows ?? []).map(v => v.voter_token)).size;

  return (
    <PresenterScreen
      session={{ id: s.id, title: s.title, join_code: s.join_code, status: s.status }}
      polls={(polls ?? []).map(p => ({ id: p.id, title: p.title, type: p.type as string, status: p.status, sort_order: p.sort_order, options: (p.options ?? []) as string[] }))}
      slides={(slides ?? []).map(sl => ({ id: sl.id, type: sl.type as string, content: sl.content as Record<string, unknown>, sort_order: sl.sort_order }))}
      initialActivePollId={activePoll?.id ?? null}
      initialActiveSlideId={s.active_slide_id ?? null}
      initialVoteCounts={initialVoteCounts}
      initialJoinedCount={initialJoinedCount}
      questions={(questions ?? []).map(q => ({ id: q.id, text: q.text, upvotes: q.upvotes }))}
    />
  );
}
