"use client";

import { useEffect, useRef, useState } from "react";
import { useChannel } from "@/core/realtime/useChannel";
import { activateNextChampionshipPoll } from "@/lib/actions/quiz";
import type { LeaderboardEntry } from "@/core/domain/leaderboard";

export type QuizDisplayPhase = {
  phase: "lobby" | "playing" | "finished";
  participants: string[];
  leaderboard: LeaderboardEntry[] | null;
  autoCountdown: number | null;
};

/**
 * Owns everything the display screen's championship overlay needs:
 * lobby roster, phase transitions, final leaderboard, and the
 * reveal → countdown → auto-advance timer. A no-op when `enabled` is
 * false (called unconditionally regardless — Rules of Hooks — but the
 * channel subscription and timer both skip doing anything).
 */
export function useQuizDisplayPhase({
  sessionId, enabled, auto, revealDuration, quizRevealed, initialParticipants,
}: {
  sessionId: string;
  enabled: boolean;
  auto: boolean;
  revealDuration: number;
  /** True while the display is showing a quiz-reveal (correct answer) for the active poll. */
  quizRevealed: boolean;
  initialParticipants?: string[];
}): QuizDisplayPhase {
  const [phase, setPhase] = useState<"lobby" | "playing" | "finished">("lobby");
  const [participants, setParticipants] = useState<string[]>(initialParticipants ?? []);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useChannel("sessionPolls", enabled ? sessionId : null, {
    participant_join: (payload) => setParticipants(payload.participants ?? []),
    quiz_start: () => setPhase("playing"),
    leaderboard: (payload) => setLeaderboard(payload.leaderboard),
    quiz_finish: (payload) => {
      if (payload.leaderboard) setLeaderboard(payload.leaderboard);
      setPhase("finished");
    },
  });

  // Auto-advance: after a reveal, wait revealDuration then count down 3→2→1 → next poll.
  useEffect(() => {
    if (!enabled || !auto || phase !== "playing" || !quizRevealed) return;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    const revealTimer = setTimeout(() => {
      let count = 3;
      setAutoCountdown(count);
      autoIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(autoIntervalRef.current!);
          autoIntervalRef.current = null;
          setAutoCountdown(null);
          void activateNextChampionshipPoll(sessionId);
        } else {
          setAutoCountdown(count);
        }
      }, 1000);
    }, revealDuration * 1000);
    autoTimerRef.current = revealTimer;
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
      setAutoCountdown(null);
    };
  }, [enabled, auto, phase, quizRevealed, sessionId, revealDuration]);

  return { phase, participants, leaderboard, autoCountdown };
}
