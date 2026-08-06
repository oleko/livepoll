"use client";

import { QrImage } from "@/core/screens/QrImage";
import { medalFor } from "@/core/screens/medal";
import type { QuizDisplayPhase } from "./useDisplayPhase";

/**
 * The three championship-only overlays on the display screen: the
 * auto-advance countdown between rounds, the pre-start lobby (QR + roster),
 * and the final leaderboard with confetti. Renders nothing once conference
 * sessions pass through — callers only mount this when the session is in
 * quiz mode. `hasActivePoll` distinguishes the lobby (shown only before the
 * first poll activates) from mid-round silence.
 */
export function QuizDisplayOverlay({ phase, hasActivePoll, joinUrl, joinCode }: {
  phase: QuizDisplayPhase;
  hasActivePoll: boolean;
  joinUrl: string;
  joinCode: string;
}) {
  const qrUrlLarge = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(joinUrl)}&bgcolor=0f172a&color=ffffff&qzone=2`;

  return (
    <>
      {phase.autoCountdown !== null && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80">
          <p className="text-2xl font-semibold text-slate-300 mb-4">Следующий вопрос через</p>
          <p className="text-9xl font-bold text-white tabular-nums">{phase.autoCountdown}</p>
        </div>
      )}

      {phase.phase === "lobby" && !hasActivePoll && (
        <div className="absolute inset-0 z-[25] flex flex-col items-center justify-center bg-slate-950">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-5xl font-bold text-white mb-2">Чемпионат</h1>
          <p className="text-xl text-slate-400 mb-10">Ожидаем участников</p>
          <div className="rounded-3xl border-2 border-slate-700 bg-slate-900 p-8"
               style={{ padding: "clamp(16px, 2.5vh, 32px)" }}>
            <QrImage src={qrUrlLarge} joinUrl={joinUrl}
              style={{ width: "clamp(140px, 36vh, 360px)", height: "clamp(140px, 36vh, 360px)" }} />
          </div>
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/60 px-8 py-3">
            <span className="font-mono text-white font-bold tracking-[0.25em]"
                  style={{ fontSize: "clamp(1.5rem, 6vh, 3.5rem)" }}>
              {joinCode}
            </span>
          </div>
          {phase.participants.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                В лобби: {phase.participants.length}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {phase.participants.map((name) => (
                  <span key={name} className="rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 px-3 py-1 text-sm font-medium">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {phase.phase === "finished" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => {
            const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#f97316"];
            const color = colors[i % colors.length];
            const left = (i * 2.5) % 100;
            const delay = (i * 0.15) % 3;
            const fast = i % 3 !== 0;
            return (
              <div
                key={i}
                className={fast ? "animate-[confetti-fall_3s_ease-in_infinite]" : "animate-[confetti-fall-slow_4s_ease-in_infinite]"}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: 0,
                  width: i % 2 === 0 ? 10 : 8,
                  height: i % 2 === 0 ? 10 : 16,
                  borderRadius: i % 3 === 0 ? "50%" : 2,
                  backgroundColor: color,
                  animationDelay: `${delay}s`,
                  animationDuration: fast ? `${2 + (i % 3) * 0.5}s` : `${3 + (i % 3) * 0.5}s`,
                }}
              />
            );
          })}
          <div className="relative z-10 flex flex-col items-center gap-6 animate-podium-rise">
            <div className="text-7xl">🏆</div>
            <h1 className="text-5xl font-bold text-white">Чемпионат завершён!</h1>
            {phase.leaderboard && phase.leaderboard.length > 0 && (
              <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-900/90 px-8 py-6 min-w-[360px]">
                <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">
                  Итоговая таблица
                </p>
                <div className="flex flex-col gap-3">
                  {phase.leaderboard.slice(0, 10).map((entry, i) => {
                    const medal = medalFor(i);
                    return (
                      <div key={entry.name} className={`flex items-center gap-4 rounded-xl px-4 py-3 ${i === 0 ? "bg-yellow-500/15 border border-yellow-500/30" : "bg-slate-800/60"}`}>
                        <span className="text-xl w-8 shrink-0 text-center">{medal}</span>
                        <span className={`flex-1 font-semibold ${i === 0 ? "text-yellow-300 text-xl" : "text-white text-base"}`}>
                          {entry.name}
                        </span>
                        <span className="tabular-nums font-bold text-slate-300">{entry.score}</span>
                        <span className="text-xs text-slate-500">{entry.correct}/{entry.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
