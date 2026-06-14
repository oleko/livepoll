"use client";

import { useState, useEffect } from "react";
import { startAnnouncement, clearAnnouncement } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/Button";

export function AnnouncementForm({ sessionId, orgSlug }: { sessionId: string; orgSlug: string }) {
  const [text, setText] = useState("");
  const [duration, setDuration] = useState(60);
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState<{ text: string; endsAt: number | null } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!active?.endsAt) { setTimeLeft(null); return; }
    const update = () => {
      const left = Math.ceil((active.endsAt! - Date.now()) / 1000);
      if (left <= 0) { setActive(null); setTimeLeft(null); }
      else setTimeLeft(left);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [active]);

  async function handleSend() {
    if (!text.trim()) return;
    setPending(true);
    await startAnnouncement(sessionId, text.trim(), duration, orgSlug);
    setPending(false);
    setActive({ text: text.trim(), endsAt: duration > 0 ? Date.now() + duration * 1000 : null });
    setText("");
  }

  async function handleClear() {
    setPending(true);
    await clearAnnouncement(sessionId, orgSlug);
    setPending(false);
    setActive(null);
    setTimeLeft(null);
  }

  if (active) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Идёт объявление</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{active.text}</p>
          {timeLeft !== null && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono tabular-nums">
              {timeLeft >= 60
                ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`
                : `${timeLeft}с`}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" loading={pending} onClick={handleClear}>
          Завершить
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={200}
        placeholder="Текст объявления..."
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handleSend(); }}
      />
      <div className="flex gap-2">
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={0}>Без таймера</option>
          <option value={30}>30 сек</option>
          <option value={60}>1 мин</option>
          <option value={120}>2 мин</option>
          <option value={300}>5 мин</option>
          <option value={600}>10 мин</option>
        </select>
        <Button className="text-xs py-2 px-3 shrink-0" loading={pending} onClick={handleSend} disabled={!text.trim()}>
          Объявить
        </Button>
      </div>
    </div>
  );
}
