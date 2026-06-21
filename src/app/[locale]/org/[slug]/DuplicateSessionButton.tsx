"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateSession } from "@/lib/actions/sessions";

export function DuplicateSessionButton({
  sessionId,
  orgSlug,
}: {
  sessionId: string;
  orgSlug: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await duplicateSession(sessionId, orgSlug);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      setTimeout(() => setError(null), 4000);
    } else {
      router.push(result.redirectTo);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        title="Дублировать мероприятие"
        className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs font-medium disabled:opacity-40"
      >
        {pending ? "…" : "⎘"}
      </button>
      {error && (
        <div className="absolute right-0 top-full mt-1 z-30 w-64 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-red-600 dark:text-red-400 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
