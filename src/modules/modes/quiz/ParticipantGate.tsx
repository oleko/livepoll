"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { medalFor } from "@/core/screens/medal";
import { getVoterToken } from "@/core/identity/voterToken";
import { registerParticipant } from "@/lib/actions/participants";
import type { LeaderboardEntry } from "@/core/domain/leaderboard";
import { useQuizParticipantPhase } from "./useParticipantPhase";

/**
 * Gates the whole participant screen behind the championship flow: name
 * registration, then a lobby wait, then whatever `children` normally
 * renders (the live round — quiz reveal, voting form, etc., unchanged),
 * then the final leaderboard once the host ends the championship. Only
 * mounted when the session is actually in quiz mode — `registered` lives
 * in the parent because the mid-round leaderboard widget outside this
 * gate also needs it (to know whether to show a "you" highlight).
 */
export function QuizParticipantGate({
  sessionId, registered, onRegistered, initialParticipants, leaderboard, children,
}: {
  sessionId: string;
  registered: boolean;
  onRegistered: () => void;
  initialParticipants: string[];
  leaderboard: LeaderboardEntry[] | null;
  children: React.ReactNode;
}) {
  const quiz = useQuizParticipantPhase({ sessionId, initialParticipants, leaderboard });
  const [participantName, setParticipantName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  async function handleRegister() {
    const voterToken = getVoterToken();
    if (!voterToken) return;
    setIsRegistering(true);
    setNameError(null);
    const result = await registerParticipant(sessionId, voterToken, participantName);
    setIsRegistering(false);
    if ("error" in result) {
      setNameError(result.error);
    } else {
      try { localStorage.setItem(`quiz_participant_${sessionId}`, participantName.trim()); } catch {}
      onRegistered();
    }
  }

  if (!registered) {
    return (
      <div className="w-full max-w-xs text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Чемпионат</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Введите имя — оно появится в таблице лидеров
        </p>
        {nameError && (
          <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-500">
            {nameError}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <input
            type="text"
            maxLength={20}
            placeholder="Ваш никнейм (2–20 символов)"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && participantName.trim().length >= 2) handleRegister(); }}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg"
            autoFocus
          />
          <Button
            className="w-full py-4 text-base"
            disabled={participantName.trim().length < 2}
            loading={isRegistering}
            onClick={handleRegister}
          >
            Участвовать
          </Button>
        </div>
        {quiz.lobbyParticipants.length > 0 && (
          <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
            Уже в лобби: {quiz.lobbyParticipants.length}
          </p>
        )}
      </div>
    );
  }

  if (quiz.phase === "finished") {
    const myName = typeof window !== "undefined"
      ? localStorage.getItem(`quiz_participant_${sessionId}`) ?? ""
      : "";
    const lb = quiz.finalLeaderboard ?? [];
    const myEntry = lb.find((e) => e.name === myName);
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Чемпионат завершён!</h2>
        {myEntry && (
          <div className="mt-4 mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 px-5 py-4">
            <p className="text-indigo-400 font-semibold text-sm mb-1">Ваш результат</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">#{myEntry.rank}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {myEntry.score} очков · {myEntry.correct}/{myEntry.total} верных
            </p>
          </div>
        )}
        {lb.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Таблица лидеров</p>
            <div className="flex flex-col gap-1.5">
              {lb.slice(0, 10).map((entry, i) => {
                const isMe = entry.name === myName;
                const medal = medalFor(i);
                return (
                  <div key={entry.name} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isMe ? "bg-indigo-500/10 border border-indigo-500/20 font-semibold" : ""}`}>
                    <span className="w-6 text-center shrink-0">{medal}</span>
                    <span className={`flex-1 text-left ${isMe ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>{entry.name}</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400 font-medium">{entry.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (quiz.phase === "lobby") {
    const myName = typeof window !== "undefined" ? localStorage.getItem(`quiz_participant_${sessionId}`) ?? "" : "";
    return (
      <div className="text-center px-6 max-w-sm">
        <div className="text-5xl mb-5">⏳</div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Вы в лобби</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          Ожидайте начала чемпионата...
        </p>
        {quiz.lobbyParticipants.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">
              Участников в лобби: {quiz.lobbyParticipants.length}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {quiz.lobbyParticipants.slice(0, 30).map((name) => {
                const isMe = name === myName;
                return (
                  <span key={name} className={`text-xs rounded-full px-2.5 py-1 border ${isMe ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-semibold" : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400"}`}>
                    {name}
                  </span>
                );
              })}
              {quiz.lobbyParticipants.length > 30 && (
                <span className="text-xs text-slate-400">+{quiz.lobbyParticipants.length - 30}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
