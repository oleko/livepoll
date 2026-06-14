"use client";

import { useState, useEffect } from "react";
import type { SlideType } from "@/lib/actions/slides";

type ScheduleItem = { time: string; title: string; active?: boolean };

type SlideData = {
  id: string;
  type: SlideType;
  content: Record<string, unknown>;
};

function SplashSlide({ c }: { c: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-16 gap-8">
      <h1 className="text-6xl lg:text-8xl font-bold text-white leading-tight tracking-tight">
        {c.title}
      </h1>
      {c.subtitle && (
        <p className="text-2xl lg:text-3xl text-slate-300 font-light max-w-3xl">{c.subtitle}</p>
      )}
      {(c.date || c.location) && (
        <p className="text-xl text-slate-400 font-medium">
          {[c.date, c.location].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function SpeakerSlide({ c }: { c: Record<string, string> }) {
  const initials = c.name
    ? c.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="flex h-full">
      {/* Left: avatar */}
      <div className="w-2/5 flex items-center justify-center bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border-r border-white/10">
        {c.photo_url ? (
          <img src={c.photo_url} alt={c.name} className="w-64 h-64 lg:w-80 lg:h-80 rounded-full object-cover shadow-2xl" />
        ) : (
          <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
            <span className="text-7xl lg:text-9xl font-bold text-white">{initials}</span>
          </div>
        )}
      </div>

      {/* Right: info */}
      <div className="flex-1 flex flex-col justify-center px-16 gap-5">
        <p className="text-lg text-indigo-400 font-semibold uppercase tracking-widest">
          Следующий докладчик
        </p>
        <h2 className="text-5xl lg:text-6xl font-bold text-white leading-tight">{c.name}</h2>
        {(c.role || c.company) && (
          <p className="text-2xl text-slate-300">
            {[c.role, c.company].filter(Boolean).join(" · ")}
          </p>
        )}
        {c.topic && (
          <div className="mt-4 border-l-4 border-indigo-500 pl-6">
            <p className="text-xl text-slate-200 italic leading-relaxed">«{c.topic}»</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleSlide({ c }: { c: { items?: ScheduleItem[] } }) {
  const items = c.items ?? [];
  const activeIdx = items.findIndex(it => it.active);

  return (
    <div className="flex flex-col h-full px-16 py-14 gap-8">
      <h2 className="text-3xl font-bold text-white">Расписание</h2>
      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        {items.map((item, i) => {
          const isActive = i === activeIdx;
          const isPast = activeIdx >= 0 && i < activeIdx;
          return (
            <div key={i} className={`flex items-center gap-6 rounded-xl px-6 py-4 transition-all ${
              isActive ? "bg-indigo-600/20 border border-indigo-500/50" : "border border-transparent"
            }`}>
              <span className={`text-xl font-mono font-semibold shrink-0 w-16 ${
                isActive ? "text-indigo-400" : isPast ? "text-slate-600" : "text-slate-400"
              }`}>{item.time}</span>
              {isActive && <span className="text-indigo-400 shrink-0 text-lg">▶</span>}
              <span className={`text-xl lg:text-2xl font-medium ${
                isActive ? "text-white" : isPast ? "text-slate-600 line-through" : "text-slate-300"
              }`}>{item.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuoteSlide({ c }: { c: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-20 gap-8 text-center">
      <div className="text-8xl text-indigo-500/40 font-serif leading-none select-none">"</div>
      <blockquote className="text-3xl lg:text-4xl text-white font-light leading-relaxed max-w-4xl -mt-8">
        {c.text}
      </blockquote>
      {c.author && (
        <p className="text-xl text-slate-400">— {c.author}</p>
      )}
    </div>
  );
}

function FinalSlide({ c }: { c: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-16 gap-8 text-center">
      <div className="text-8xl">🎉</div>
      <h1 className="text-5xl lg:text-7xl font-bold text-white">{c.title || "Спасибо за участие!"}</h1>
      {c.subtitle && <p className="text-2xl text-slate-300 font-light">{c.subtitle}</p>}
      {c.url && (
        <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl px-8 py-4">
          <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-medium">Материалы</p>
          <p className="text-2xl text-indigo-400 font-medium">{c.url}</p>
        </div>
      )}
    </div>
  );
}

function AnnouncementSlide({ c }: { c: Record<string, unknown> }) {
  const text = c.text as string ?? "";
  const duration = (c.duration as number | undefined) ?? 0;
  const [timeLeft, setTimeLeft] = useState(duration > 0 ? duration : null);

  useEffect(() => {
    if (!duration) return;
    setTimeLeft(duration);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [duration]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-16 text-center">
      <div className="text-6xl">📢</div>
      <p className="font-bold text-white leading-tight" style={{ fontSize: "clamp(2.5rem, 8vh, 5rem)" }}>
        {text}
      </p>
      {timeLeft !== null && timeLeft > 0 && (
        <p className={`text-8xl font-mono font-bold tabular-nums ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-indigo-400"}`}>
          {timeLeft >= 60
            ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`
            : timeLeft}
        </p>
      )}
    </div>
  );
}

function SpinWheelSlide({ c, phase, countdown, forcedWinner, onWinner }: {
  c: Record<string, unknown>;
  phase: "idle" | "countdown" | "spinning";
  countdown: number;
  forcedWinner?: string | null;
  onWinner?: (w: string) => void;
}) {
  const options = (c.options as string[] | undefined) ?? [];
  const title = c.title as string | undefined;
  const [displayIdx, setDisplayIdx] = useState(0);
  const [winner, setWinner] = useState<string | null>(forcedWinner ?? null);

  useEffect(() => {
    if (phase !== "spinning") return;
    if (options.length === 0) return;
    if (options.length === 1) {
      setWinner(options[0]);
      onWinner?.(options[0]);
      return;
    }

    setWinner(null);
    setDisplayIdx(0);
    const winnerIdx = Math.floor(Math.random() * options.length);
    let step = 0;
    const totalSteps = 28 + Math.floor(Math.random() * 8);
    let tid: ReturnType<typeof setTimeout>;

    const spin = () => {
      setDisplayIdx((idx) => (idx + 1) % options.length);
      step++;
      const progress = step / totalSteps;
      const delay = progress < 0.45
        ? 55 + progress * 80
        : 80 + (progress - 0.45) * 520;
      if (step < totalSteps) {
        tid = setTimeout(spin, delay);
      } else {
        setDisplayIdx(winnerIdx);
        setTimeout(() => {
          setWinner(options[winnerIdx]);
          onWinner?.(options[winnerIdx]);
        }, 250);
      }
    };
    tid = setTimeout(spin, 200);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (options.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-2xl">Нет вариантов</p>
      </div>
    );
  }

  // Idle with saved winner (page refresh) — show result directly
  if (phase === "idle" && forcedWinner) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-10 px-16 text-center">
        {title && <h2 className="text-4xl font-bold text-white">{title}</h2>}
        <p className="text-indigo-400 text-2xl font-semibold uppercase tracking-widest">🎉 Победитель!</p>
        <p className="font-bold text-white leading-none" style={{ fontSize: "clamp(3.5rem, 12vh, 9rem)" }}>
          {forcedWinner}
        </p>
        {options.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
            {options.filter(o => o !== forcedWinner).map((opt, i) => (
              <span key={i} className="text-slate-600 text-lg px-4 py-1.5 border border-slate-800 rounded-full">{opt}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Idle — show all options as a list
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 px-16 text-center">
        {title && <h2 className="text-4xl font-bold text-white">{title}</h2>}
        <p className="text-slate-400 text-lg uppercase tracking-widest font-medium">🎡 Варианты</p>
        <div className="flex flex-wrap gap-3 justify-center max-w-4xl">
          {options.map((opt, i) => (
            <span key={i} className="text-white text-2xl font-semibold px-6 py-3 rounded-2xl border border-slate-700 bg-slate-800/60">
              {opt}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Countdown — 3, 2, 1
  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
        {title && <h2 className="text-4xl font-bold text-white">{title}</h2>}
        <p className="text-slate-400 text-xl uppercase tracking-widest font-medium">🎡 Приготовьтесь…</p>
        <p
          key={countdown}
          className="font-black text-white tabular-nums animate-ping-once"
          style={{ fontSize: "clamp(8rem, 28vh, 18rem)", lineHeight: 1 }}
        >
          {countdown > 0 ? countdown : ""}
        </p>
      </div>
    );
  }

  // Spinning / result
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-16 text-center">
      {title && <h2 className="text-4xl font-bold text-white">{title}</h2>}

      <div className="flex flex-col items-center gap-6 w-full">
        {!winner ? (
          <>
            <p className="text-slate-400 text-xl uppercase tracking-widest font-medium animate-pulse">
              🎡 Крутим…
            </p>
            <p
              className="font-bold text-white leading-none transition-all duration-75"
              style={{ fontSize: "clamp(3rem, 10vh, 8rem)" }}
            >
              {options[displayIdx]}
            </p>
          </>
        ) : (
          <>
            <p className="text-indigo-400 text-2xl font-semibold uppercase tracking-widest">🎉 Победитель!</p>
            <p
              className="font-bold text-white leading-none"
              style={{ fontSize: "clamp(3.5rem, 12vh, 9rem)" }}
            >
              {winner}
            </p>
          </>
        )}
      </div>

      {winner && options.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
          {options.filter((o) => o !== winner).map((opt, i) => (
            <span key={i} className="text-slate-600 text-lg px-4 py-1.5 border border-slate-800 rounded-full">
              {opt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type BuzzerEntry = { token: string; ts: number };

function RevealSlide({ c, revealed, buzzers }: {
  c: Record<string, unknown>;
  revealed: boolean;
  buzzers: BuzzerEntry[];
}) {
  const question = (c.question as string) ?? "";
  const answer = (c.answer as string) ?? "";
  const buzz = c.buzz as boolean | undefined;

  return (
    <div className="flex flex-col items-center justify-center h-full px-16 gap-10 text-center">
      <p className="font-bold text-white leading-tight max-w-4xl" style={{ fontSize: "clamp(2.5rem, 7vh, 5rem)" }}>
        {question}
      </p>

      <div className={`transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}>
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-12 py-6">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-3">Ответ</p>
          <p className="text-white font-bold leading-snug" style={{ fontSize: "clamp(1.75rem, 5vh, 3.5rem)" }}>
            {answer}
          </p>
        </div>
      </div>

      {buzz && buzzers.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {buzzers.slice(0, 5).map((b, i) => (
            <div key={b.token} className={`flex items-center gap-2 rounded-xl px-4 py-2 border ${
              i === 0
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-white/5 border-white/10 text-slate-400"
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

export function SlideView({ slide, slideShowKey = 0, revealed = false, buzzers = [], spinPhase = "idle", spinCountdown = 3, spinWinner, onSpinWinner }: {
  slide: SlideData;
  slideShowKey?: number;
  revealed?: boolean;
  buzzers?: BuzzerEntry[];
  spinPhase?: "idle" | "countdown" | "spinning";
  spinCountdown?: number;
  spinWinner?: string | null;
  onSpinWinner?: (w: string) => void;
}) {
  const c = slide.content as Record<string, unknown>;
  return (
    <div className="w-full h-full bg-slate-950">
      {slide.type === "splash"       && <SplashSlide       c={c as Record<string, string>} />}
      {slide.type === "speaker"      && <SpeakerSlide      c={c as Record<string, string>} />}
      {slide.type === "schedule"     && <ScheduleSlide     c={c as { items?: ScheduleItem[] }} />}
      {slide.type === "quote"        && <QuoteSlide        c={c as Record<string, string>} />}
      {slide.type === "final"        && <FinalSlide        c={c as Record<string, string>} />}
      {slide.type === "spin_wheel"   && <SpinWheelSlide    key={`spin-${slideShowKey}`} c={c} phase={spinPhase} countdown={spinCountdown} forcedWinner={spinWinner} onWinner={onSpinWinner} />}
      {slide.type === "announcement" && <AnnouncementSlide c={c} />}
      {slide.type === "reveal"       && <RevealSlide       c={c} revealed={revealed} buzzers={buzzers} />}
    </div>
  );
}
