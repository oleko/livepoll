"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PollList } from "./PollList";
import { CreationTabs } from "./CreationTabs";
import { QAPanel } from "./QAPanel";
import type { SlideRow } from "@/lib/actions/slides";
import type { Poll } from "@/types/database";

type SectionItem = { id: string; title: string; sort_order: number };
type CopyTarget = { id: string; title: string; status: string };
type QuizPoll = { id: string; title: string; settings?: Record<string, unknown> | null };
type Question = { id: string; text: string; status: "pending" | "answered" | "hidden"; upvotes: number; created_at: string };
type PollRow = Pick<Poll, "id" | "title" | "type" | "status" | "sort_order"> & {
  options: unknown[];
  created_at: string;
  section_id: string | null;
  settings?: Record<string, unknown> | null;
};

export function SessionLayout({
  sessionId,
  orgSlug,
  sessionStatus,
  polls,
  slides,
  activeSlideId,
  votesByPoll,
  votesDataByPoll,
  votesTimelineByPoll,
  sections,
  questions,
  quizPolls,
  championship,
  copyTargets,
}: {
  sessionId: string;
  orgSlug: string;
  sessionStatus: "draft" | "active" | "ended";
  polls: PollRow[];
  slides: SlideRow[];
  activeSlideId: string | null;
  votesByPoll: Record<string, number>;
  votesDataByPoll: Record<string, Record<string, number>>;
  votesTimelineByPoll: Record<string, string[]>;
  sections: SectionItem[];
  questions: Question[];
  quizPolls: QuizPoll[];
  championship: { enabled: boolean; auto: boolean; reveal_duration: number };
  copyTargets: CopyTarget[];
}) {
  const t = useTranslations("Org.session.layout");
  const [activeTab, setActiveTab] = useState<"lineup" | "qa" | "settings">("lineup");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && drawerOpen) setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const pendingCount = questions.filter(q => q.status === "pending").length;
  const totalVotes = Object.values(votesByPoll).reduce((a, b) => a + b, 0);

  const tabs: { id: "lineup" | "qa" | "settings"; label: string }[] = [
    { id: "lineup", label: t("lineupTab") },
    {
      id: "qa",
      label: pendingCount > 0 ? `${t("qaTab")} · ${pendingCount}` : t("qaTab"),
    },
    { id: "settings", label: t("settingsTab") },
  ];

  function switchTab(id: "lineup" | "qa" | "settings") {
    setActiveTab(id);
    setDrawerOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Session-level underline tab bar ──────────────────── */}
      <div role="tablist" className="flex border-b border-slate-200 dark:border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => switchTab(tab.id)}
            className={`mr-6 pb-2.5 pt-0.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors duration-150 ${
              activeTab === tab.id
                ? "text-slate-900 dark:text-white border-indigo-500"
                : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Lineup tab ───────────────────────────────────────── */}
      {activeTab === "lineup" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_440px]">

          {/* Left: program lineup + add button */}
          <div className="flex flex-col gap-4">
            <PollList
              polls={polls}
              slides={slides}
              activeSlideId={activeSlideId}
              votesByPoll={votesByPoll}
              votesDataByPoll={votesDataByPoll}
              votesTimelineByPoll={votesTimelineByPoll}
              sessionId={sessionId}
              orgSlug={orgSlug}
              sessionStatus={sessionStatus}
              copyTargets={copyTargets}
              sections={sections}
            />
            {sessionStatus !== "ended" && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-3.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {t("addButton")}
              </button>
            )}
          </div>

          {/* Right: empty state panel */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col gap-3 items-start h-fit">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
              <div className="w-3.5 h-3.5 rounded border-2 border-indigo-400 dark:border-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{t("emptyTitle")}</p>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t("emptyDesc")}</p>
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-600 mt-1">
              {t("totalVotes", { count: totalVotes })}
            </p>
          </div>

        </div>
      )}

      {/* ── Q&A tab ──────────────────────────────────────────── */}
      {activeTab === "qa" && (
        <QAPanel
          sessionId={sessionId}
          orgSlug={orgSlug}
          initialQuestions={questions}
        />
      )}

      {/* ── Settings tab ─────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <Link
            href={`/org/${orgSlug}/settings`}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t("settingsLink")} →
          </Link>
        </div>
      )}

      {/* ── Creation drawer ───────────────────────────────────── */}
      {sessionStatus !== "ended" && (
        <>
          {/* Backdrop */}
          {drawerOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 animate-overlay-in"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Slide-in panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("drawerTitle")}
            className={`fixed top-0 right-0 h-full w-full max-w-[440px] z-50 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out ${
              drawerOpen ? "translate-x-0 animate-drawer-in" : "translate-x-full pointer-events-none"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("drawerTitle")}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label={t("closeDrawer")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <CreationTabs
                sessionId={sessionId}
                orgSlug={orgSlug}
                sections={sections}
                quizPolls={quizPolls}
                championship={championship}
                sessionStatus={sessionStatus}
              />
            </div>
          </div>
        </>
      )}

    </div>
  );
}
