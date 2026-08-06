"use client";

import { useEffect, useRef, useState } from "react";
import { useChannel } from "@/core/realtime/useChannel";
import type { LeaderboardEntry } from "@/core/domain/leaderboard";

export type QuizParticipantPhase = {
  phase: "lobby" | "playing" | "finished";
  lobbyParticipants: string[];
  finalLeaderboard: LeaderboardEntry[] | null;
};

/**
 * Owns the participant-side championship phase: lobby roster and the
 * lobby → playing → finished transitions. The final leaderboard is
 * captured from whatever `leaderboard` value the caller currently holds
 * at the moment `quiz_finish` fires (that event's own payload is always
 * empty in practice — the real data arrives moments earlier via the
 * `leaderboard` broadcast, which VoteInterface already subscribes to for
 * the shared mid-round widget, so this hook doesn't re-subscribe to it).
 */
export function useQuizParticipantPhase({
  sessionId, initialParticipants, leaderboard,
}: {
  sessionId: string;
  initialParticipants: string[];
  leaderboard: LeaderboardEntry[] | null;
}): QuizParticipantPhase {
  const [phase, setPhase] = useState<"lobby" | "playing" | "finished">("lobby");
  const [lobbyParticipants, setLobbyParticipants] = useState<string[]>(initialParticipants);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const leaderboardRef = useRef(leaderboard);
  useEffect(() => { leaderboardRef.current = leaderboard; }, [leaderboard]);

  useChannel("sessionPolls", sessionId, {
    participant_join: (payload) => setLobbyParticipants(payload.participants ?? []),
    quiz_start: () => setPhase("playing"),
    quiz_finish: (payload) => {
      setFinalLeaderboard(payload.leaderboard ?? leaderboardRef.current);
      setPhase("finished");
    },
  });

  return { phase, lobbyParticipants, finalLeaderboard };
}
