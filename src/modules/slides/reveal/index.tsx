"use client";

import { useEffect, useRef, useState } from "react";
import { useChannel } from "@/core/realtime/useChannel";
import { getVoterToken } from "@/core/identity/voterToken";
import { revealAnswer } from "@/lib/actions/slides";
import type { SlideType } from "@/core/domain/slide";
import type { SlideDisplayProps, SlideLiveCtx, SlideTypeModule } from "@/core/modules/slide";

type BuzzerEntry = { token: string; ts: number };
export type RevealLive = { revealed: boolean; buzzers: BuzzerEntry[] };

function useRevealDisplayLive({ sessionId, slideId, showKey }: SlideLiveCtx): RevealLive {
  const [revealed, setRevealed] = useState(false);
  const [buzzers, setBuzzers] = useState<BuzzerEntry[]>([]);

  const lastShowKey = useRef(showKey);
  useEffect(() => {
    if (lastShowKey.current === showKey) return;
    lastShowKey.current = showKey;
    setRevealed(false);
    setBuzzers([]);
  }, [showKey]);

  useChannel("sessionSlides", sessionId, {
    slide_reveal: (payload) => {
      if (payload.slide_id === slideId) setRevealed(true);
    },
  });

  useChannel("sessionBuzz", sessionId, {
    buzz: (payload) => {
      setBuzzers((prev) => {
        if (prev.some((b) => b.token === payload.token)) return prev;
        return [...prev, { token: payload.token, ts: payload.ts }].sort((a, b) => a.ts - b.ts);
      });
    },
  });

  return { revealed, buzzers };
}

function Display({ content, live }: SlideDisplayProps<RevealLive>) {
  const question = (content.question as string) ?? "";
  const answer = (content.answer as string) ?? "";
  const buzz = content.buzz as boolean | undefined;
  const { revealed, buzzers } = live;

  return (
    <div className="flex flex-col items-center justify-center h-full px-16 gap-10 text-center">
      <p className="font-bold text-white leading-tight max-w-4xl" style={{ fontSize: "clamp(2.5rem, 7vh, 5rem)" }}>{question}</p>
      <div className={`transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}>
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-12 py-6">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-3">Ответ</p>
          <p className="text-white font-bold leading-snug" style={{ fontSize: "clamp(1.75rem, 5vh, 3.5rem)" }}>{answer}</p>
        </div>
      </div>
      {buzz && buzzers.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {buzzers.slice(0, 5).map((b, i) => (
            <div key={b.token} className={`flex items-center gap-2 rounded-xl px-4 py-2 border ${
              i === 0 ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-white/5 border-white/10 text-slate-400"
            }`}>
              {i === 0 && <span>⚡</span>}
              <span className="text-sm font-mono">{b.token.slice(0, 6).toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Participant side (buzz button) — imported directly by VoteInterface,
// since only this one slide type has an interactive participant surface. ───

export type RevealParticipantLive = { buzzed: boolean; onBuzz: () => void };

export function useRevealParticipantLive({ sessionId, slide }: {
  sessionId: string;
  slide: { type: SlideType; content: Record<string, unknown> } | null;
}): RevealParticipantLive {
  const [buzzed, setBuzzed] = useState(false);
  const isActive = slide?.type === "reveal" && !!(slide.content as { buzz?: boolean }).buzz;

  useEffect(() => {
    const reset = () => setBuzzed(false);
    reset();
  }, [slide]);

  const { send } = useChannel("sessionBuzz", isActive ? sessionId : null, {});

  function onBuzz() {
    if (buzzed) return;
    send("buzz", { token: getVoterToken(), ts: Date.now() });
    setBuzzed(true);
  }

  return { buzzed, onBuzz };
}

export function RevealParticipant({ content, live }: { content: Record<string, unknown>; live: RevealParticipantLive }) {
  const question = (content.question as string) ?? "";
  const { buzzed, onBuzz } = live;
  return (
    <div className="text-center px-6 max-w-sm w-full flex flex-col items-center">
      {question && (
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-snug">{question}</h2>
      )}
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">
        {buzzed ? "Ожидай подтверждения ведущего" : "Знаешь ответ? Нажми быстрее всех!"}
      </p>
      {buzzed ? (
        <div className="flex flex-col items-center gap-3">
          <span className="text-7xl animate-bounce">🔥</span>
          <p className="text-xl font-bold text-orange-500 dark:text-orange-400">Ты нажал!</p>
        </div>
      ) : (
        <button
          onClick={onBuzz}
          className="w-44 h-44 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-transform text-white flex flex-col items-center justify-center gap-3 shadow-xl shadow-indigo-500/30"
        >
          <span className="text-5xl">⚡</span>
          <span className="text-xl font-bold">Я знаю!</span>
        </button>
      )}
    </div>
  );
}

export const reveal: SlideTypeModule<RevealLive> = {
  id: "reveal",
  meta: { icon: "❓", labelKey: "Org.shared.slideTypeLabel.reveal", order: 7 },
  content: {
    defaults: () => ({}),
    fromRow: (raw) => (raw && typeof raw === "object" ? raw as Record<string, unknown> : {}),
    preview: (c, t) => {
      const q = c.question as string | undefined;
      return q ? q.slice(0, 40) : t("Org.session.pollList.slidePreview.reveal");
    },
    fields: [
      { kind: "textarea", name: "question", labelKey: "Org.session.addSlidePanel.reveal.question", required: true, rows: 2 },
      { kind: "textarea", name: "answer", labelKey: "Org.session.addSlidePanel.reveal.answer", rows: 2 },
      { kind: "toggle", name: "buzz", labelKey: "Org.session.addSlidePanel.reveal.buzz" },
    ],
  },
  participantEffect: "interactive",
  useDisplayLive: useRevealDisplayLive,
  render: { display: Display },
  hostActions: [
    {
      id: "reveal",
      labelKey: "Org.session.pollList.revealAnswerLabel",
      whenActive: true,
      run: async ({ slideId, sessionId, orgSlug }) => { await revealAnswer(slideId, sessionId, orgSlug); },
    },
  ],
};
