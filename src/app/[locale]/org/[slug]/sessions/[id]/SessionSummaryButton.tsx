"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { generateSessionSummary } from "@/lib/actions/ai";

export function SessionSummaryButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations("Org.session.summary");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setOpen(true);
    if (summary) return;
    setLoading(true);
    setError(null);
    const result = await generateSessionSummary(sessionId);
    setLoading(false);
    if ("error" in result) setError(result.error ?? t("error"));
    else setSummary(result.summary ?? null);
  }

  return (
    <>
      <button
        onClick={run}
        className="flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors"
      >
        {t("trigger")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-modal-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">{t("title")}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 dark:text-red-400">
                  {error}
                </div>
              )}

              {summary && (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                    {summary}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(summary);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {t("copy")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
