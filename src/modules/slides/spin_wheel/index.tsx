"use client";

import { useEffect, useRef, useState } from "react";
import { useChannel } from "@/core/realtime/useChannel";
import { startSpinWheel } from "@/lib/actions/slides";
import type { SlideDisplayProps, SlideLiveCtx, SlideTypeModule } from "@/core/modules/slide";

type SpinPhase = "idle" | "countdown" | "spinning";
export type SpinLive = { phase: SpinPhase; countdown: number; winner: string | null; onWinner: (w: string) => void };

function useSpinDisplayLive({ sessionId, slideId, showKey }: SlideLiveCtx): SpinLive {
  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return sessionStorage.getItem(`spin-winner-${slideId}`); } catch { return null; }
  });

  // Every (re-)show of this slide starts fresh, matching the old slide_change handler.
  const lastShowKey = useRef(showKey);
  useEffect(() => {
    if (lastShowKey.current === showKey) return;
    lastShowKey.current = showKey;
    setPhase("idle");
    setCountdown(3);
    setWinner(null);
  }, [showKey]);

  useChannel("sessionSlides", sessionId, {
    spin_start: () => {
      setCountdown(3);
      setPhase("countdown");
    },
  });

  useEffect(() => {
    if (phase !== "countdown") return;
    const tick = () => {
      if (countdown <= 0) { setPhase("spinning"); return; }
    };
    tick();
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  function onWinner(w: string) {
    try { sessionStorage.setItem(`spin-winner-${slideId}`, w); } catch {}
    setWinner(w);
  }

  return { phase, countdown, winner, onWinner };
}

function Display({ content, live }: SlideDisplayProps<SpinLive>) {
  const options = (content.options as string[] | undefined) ?? [];
  const title = content.title as string | undefined;
  const { phase, countdown, winner: forcedWinner, onWinner } = live;
  const [displayIdx, setDisplayIdx] = useState(0);
  const [winner, setWinner] = useState<string | null>(forcedWinner ?? null);

  useEffect(() => {
    if (phase !== "spinning") return;
    if (options.length === 0) return;
    if (options.length === 1) {
      const finish = () => { setWinner(options[0]); onWinner(options[0]); };
      finish();
      return;
    }
    const start = () => { setWinner(null); setDisplayIdx(0); };
    start();
    const winnerIdx = Math.floor(Math.random() * options.length);
    let step = 0;
    const totalSteps = 28 + Math.floor(Math.random() * 8);
    let tid: ReturnType<typeof setTimeout>;
    const spin = () => {
      setDisplayIdx((idx) => (idx + 1) % options.length);
      step++;
      const progress = step / totalSteps;
      const delay = progress < 0.45 ? 55 + progress * 80 : 80 + (progress - 0.45) * 520;
      if (step < totalSteps) {
        tid = setTimeout(spin, delay);
      } else {
        setDisplayIdx(winnerIdx);
        setTimeout(() => {
          setWinner(options[winnerIdx]);
          onWinner(options[winnerIdx]);
        }, 250);
      }
    };
    tid = setTimeout(spin, 200);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (options.length === 0) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-400 text-2xl">Нет вариантов</p></div>;
  }

  if (phase === "idle" && forcedWinner) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-10 px-16 text-center">
        {title && <h2 className="text-4xl font-bold text-white">{title}</h2>}
        <p className="text-indigo-400 text-2xl font-semibold uppercase tracking-widest">🎉 Победитель!</p>
        <p className="font-bold text-white leading-none" style={{ fontSize: "clamp(3.5rem, 12vh, 9rem)" }}>{forcedWinner}</p>
        {options.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
            {options.filter((o) => o !== forcedWinner).map((opt, i) => (
              <span key={i} className="text-slate-600 text-lg px-4 py-1.5 border border-slate-800 rounded-full">{opt}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 px-16 text-center">
        {title && <h2 className="text-4xl font-bold text-white">{title}</h2>}
        <p className="text-slate-400 text-lg uppercase tracking-widest font-medium">🎡 Варианты</p>
        <div className="flex flex-wrap gap-3 justify-center max-w-4xl">
          {options.map((opt, i) => (
            <span key={i} className="text-white text-2xl font-semibold px-6 py-3 rounded-2xl border border-slate-700 bg-slate-800/60">{opt}</span>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
        {title && <h2 className="text-4xl font-bold text-white">{title}</h2>}
        <p className="text-slate-400 text-xl uppercase tracking-widest font-medium">🎡 Приготовьтесь…</p>
        <p key={countdown} className="font-black text-white tabular-nums animate-ping-once" style={{ fontSize: "clamp(8rem, 28vh, 18rem)", lineHeight: 1 }}>
          {countdown > 0 ? countdown : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-16 text-center">
      {title && <h2 className="text-4xl font-bold text-white">{title}</h2>}
      <div className="flex flex-col items-center gap-6 w-full">
        {!winner ? (
          <>
            <p className="text-slate-400 text-xl uppercase tracking-widest font-medium animate-pulse">🎡 Крутим…</p>
            <p className="font-bold text-white leading-none transition-all duration-75" style={{ fontSize: "clamp(3rem, 10vh, 8rem)" }}>
              {options[displayIdx]}
            </p>
          </>
        ) : (
          <>
            <p className="text-indigo-400 text-2xl font-semibold uppercase tracking-widest">🎉 Победитель!</p>
            <p className="font-bold text-white leading-none" style={{ fontSize: "clamp(3.5rem, 12vh, 9rem)" }}>{winner}</p>
          </>
        )}
      </div>
      {winner && options.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
          {options.filter((o) => o !== winner).map((opt, i) => (
            <span key={i} className="text-slate-600 text-lg px-4 py-1.5 border border-slate-800 rounded-full">{opt}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const SPIN_OPTION_MAX = 40;

export const spin_wheel: SlideTypeModule<SpinLive> = {
  id: "spin_wheel",
  meta: { icon: "🎡", labelKey: "Org.shared.slideTypeLabel.spin_wheel", order: 5 },
  content: {
    defaults: () => ({ options: [] }),
    fromRow: (raw) => (raw && typeof raw === "object" ? raw as Record<string, unknown> : { options: [] }),
    preview: (c, t) => (c.title as string) || t("Org.session.pollList.slidePreview.spinWheel"),
    fields: [
      { kind: "text", name: "title", labelKey: "Org.session.addSlidePanel.spinWheel.title" },
      {
        kind: "list", name: "options", labelKey: "Org.session.addSlidePanel.spinWheel.optionsLabel",
        itemMaxLength: SPIN_OPTION_MAX, placeholderKey: "Org.session.addSlidePanel.spinWheel.optionsPlaceholder",
        tooLongKey: "Org.session.addSlidePanel.spinWheel.tooLong",
      },
    ],
  },
  participantEffect: null,
  useDisplayLive: useSpinDisplayLive,
  render: { display: Display },
  hostActions: [
    {
      id: "launch",
      labelKey: "Org.session.pollList.launchWheel",
      whenActive: true,
      run: async ({ slideId, sessionId, orgSlug }) => { await startSpinWheel(slideId, sessionId, orgSlug); },
    },
  ],
};
