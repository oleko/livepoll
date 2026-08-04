"use client";

import { formatClock } from "@/core/format/time";

/**
 * The full-screen "📢 announcement" overlay. `display` is the projector
 * treatment (larger type, darker scrim); `participant` is the phone
 * treatment (compact, fills the viewport). Both used to be independent JSX
 * blocks in DisplayScreen and VoteInterface with the same structure.
 */
export function AnnouncementOverlay({
  variant,
  text,
  timeLeft,
}: {
  variant: "display" | "participant";
  text: string;
  timeLeft: number | null;
}) {
  if (variant === "display") {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/92">
        <div className="text-center px-12 max-w-3xl">
          <div className="text-5xl mb-6">📢</div>
          <p className="text-5xl font-bold text-white leading-tight mb-8">{text}</p>
          {timeLeft !== null && timeLeft > 0 && (
            <p className="text-8xl font-mono font-bold text-indigo-400 tabular-nums">
              {formatClock(timeLeft)}
            </p>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 px-6">
      <div className="text-center max-w-sm w-full">
        <div className="text-5xl mb-5">📢</div>
        <p className="text-2xl font-bold text-white leading-snug mb-6">{text}</p>
        {timeLeft !== null && timeLeft > 0 && (
          <p className="text-6xl font-mono font-bold text-indigo-400 tabular-nums">
            {formatClock(timeLeft)}
          </p>
        )}
      </div>
    </div>
  );
}
