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
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-0.5">
      <span className="text-[11px] text-slate-400 dark:text-slate-500 pl-1.5 pr-0.5 select-none">👥</span>
      <button
        onClick={() => update(count - 1)}
        className="w-5 h-5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs flex items-center justify-center transition-colors"
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
        className="w-10 text-center text-xs font-semibold text-slate-900 dark:text-white tabular-nums bg-transparent focus:outline-none"
      />
      <button
        onClick={() => update(count + 1)}
        className="w-5 h-5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs flex items-center justify-center transition-colors"
      >
        +
      </button>
    </div>
  );
}
