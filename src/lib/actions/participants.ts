"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, assertSessionMember } from "@/lib/actions/guards";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(s: string) { return UUID_RE.test(s); }

export type LeaderboardEntry = {
  name: string;
  score: number;
  correct: number;
  total: number;
  rank: number;
};

export async function registerParticipant(
  sessionId: string,
  voterToken: string,
  name: string
): Promise<{ error: string } | { success: true }> {
  if (!isValidUUID(sessionId) || !isValidUUID(voterToken)) {
    return { error: "Некорректный запрос" };
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 20) {
    return { error: "Имя должно быть от 2 до 20 символов" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("participants" as never).upsert(
    { session_id: sessionId, voter_token: voterToken, name: trimmedName } as never,
    { onConflict: "session_id,voter_token", ignoreDuplicates: false }
  );

  if (error) return { error: "Не удалось зарегистрироваться" };

  // Broadcast participant_join so lobby screens update in realtime
  const { data: countRow } = await admin
    .from("participants" as never)
    .select("name")
    .eq("session_id", sessionId);
  const allNames = ((countRow ?? []) as { name: string }[]).map((r) => r.name);

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({
      messages: [{
        topic: `session-polls:${sessionId}`,
        event: "participant_join",
        payload: { name: trimmedName, participants: allNames },
      }],
    }),
  }).catch(() => {});

  return { success: true };
}

export async function computeAndBroadcastLeaderboard(
  sessionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: ReturnType<typeof createAdminClient>
): Promise<void> {
  type PollRow = {
    id: string;
    settings: {
      quiz_mode?: boolean;
      correct_option?: string;
      activated_at?: string;
      duration?: number;
    } | null;
  };

  // Fetch closed quiz polls for this session
  const { data: quizPolls } = await admin
    .from("polls")
    .select("id, settings")
    .eq("session_id", sessionId)
    .eq("status", "closed");

  const polls = ((quizPolls ?? []) as PollRow[]).filter(
    (p) => p.settings?.quiz_mode === true
  );

  if (polls.length === 0) return;

  const pollIds = polls.map((p) => p.id);

  // Fetch all votes for those polls
  const { data: votes } = await admin
    .from("votes")
    .select("poll_id, voter_token, value, created_at")
    .in("poll_id", pollIds);

  // Fetch participants for this session
  type ParticipantRow = { voter_token: string; name: string };
  const { data: participantsRaw } = await admin
    .from("participants" as never)
    .select("voter_token, name")
    .eq("session_id", sessionId);
  const participants = (participantsRaw ?? []) as ParticipantRow[];

  if (participants.length === 0) return;

  type VoteRow = { poll_id: string; voter_token: string; value: string; created_at: string };
  const voteList: VoteRow[] = (votes ?? []) as VoteRow[];

  // Map voter_token → name
  const nameMap = new Map<string, string>();
  for (const p of participants) {
    nameMap.set(p.voter_token, p.name);
  }

  // Compute per-participant scores
  const scores = new Map<string, { score: number; correct: number }>();
  for (const token of nameMap.keys()) {
    scores.set(token, { score: 0, correct: 0 });
  }

  for (const poll of polls) {
    const settings = poll.settings;
    if (!settings?.correct_option || !settings?.activated_at) continue;

    const activatedAt = new Date(settings.activated_at).getTime();
    const duration = settings.duration ?? 30;

    const pollVotes = voteList.filter((v) => v.poll_id === poll.id);
    for (const vote of pollVotes) {
      if (!nameMap.has(vote.voter_token)) continue;
      const entry = scores.get(vote.voter_token)!;
      if (vote.value === settings.correct_option) {
        const elapsed = Math.max(0, (new Date(vote.created_at).getTime() - activatedAt) / 1000);
        const ratio = Math.min(1, elapsed / duration);
        entry.score += Math.round(1000 - ratio * 500);
        entry.correct += 1;
      }
    }
  }

  const total = polls.length;
  const leaderboard: LeaderboardEntry[] = Array.from(scores.entries())
    .map(([token, { score, correct }]) => ({
      name: nameMap.get(token)!,
      score,
      correct,
      total,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({
      messages: [{
        topic: `session-polls:${sessionId}`,
        event: "leaderboard",
        payload: { leaderboard },
      }],
    }),
  }).catch(() => {});
}

export async function broadcastLeaderboard(
  sessionId: string
): Promise<{ error: string } | { success: true }> {
  if (!isValidUUID(sessionId)) return { error: "Некорректный запрос" };

  const { user, admin } = await getAuthUser();
  await assertSessionMember(user.id, sessionId, admin);

  await computeAndBroadcastLeaderboard(sessionId, admin);
  return { success: true };
}
