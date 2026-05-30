"use client";

import { useState, useTransition } from "react";
import { setAttendees } from "@/lib/actions/sessions";

export function AttendeesInput({
  sessionId,
  orgSlug,
  initial,
}: {
  sessionId: string;
  orgSlug: string;
  initial: number;
}) {
  const [count, setCount] = useState(initial);
  const [inputValue, setInputValue] = useState(String(initial));
  const [, startTransition] = useTransition();

  function update(next: number) {
    const clamped = Math.max(0, next);
    setCount(clamped);
    setInputValue(String(clamped));
    startTransition(() => setAttendees(sessionId, clamped, orgSlug));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }

  function handleInputBlur() {
    const parsed = parseInt(inputValue, 10);
    update(isNaN(parsed) ? count : parsed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500 dark:text-slate-400">Присутствующих:</span>
      <button
        onClick={() => update(count - 1)}
        className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center justify-center"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className="w-14 text-center text-sm font-semibold text-slate-900 dark:text-white tabular-nums rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <button
        onClick={() => update(count + 1)}
        className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}
