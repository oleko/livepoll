"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { NewPollForm } from "./NewPollForm";
import { AddSlidePanel } from "./AddSlidePanel";
import { QuizTab } from "./QuizTab";

type SectionItem = { id: string; title: string };
type QuizPoll = { id: string; title: string; settings?: Record<string, unknown> | null };

export function CreationTabs({
  sessionId,
  orgSlug,
  sections,
  quizPolls = [],
  championship,
  sessionStatus,
}: {
  sessionId: string;
  orgSlug: string;
  sections: SectionItem[];
  quizPolls?: QuizPoll[];
  championship?: { enabled: boolean; auto: boolean; reveal_duration: number };
  sessionStatus?: "draft" | "active" | "ended";
}) {
  const t = useTranslations("Org.session.creationTabs");
  const [tab, setTab] = useState<"poll" | "slide" | "quiz">("poll");

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => setTab("poll")}
          className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${
            tab === "poll"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          {t("pollTab")}
        </button>
        <button
          type="button"
          onClick={() => setTab("slide")}
          className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${
            tab === "slide"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          {t("slideTab")}
        </button>
        <button
          type="button"
          onClick={() => setTab("quiz")}
          className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${
            tab === "quiz"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          {t("quizTab")}
        </button>
      </div>

      {tab === "poll" && (
        <NewPollForm sessionId={sessionId} orgSlug={orgSlug} sections={sections} />
      )}
      {tab === "slide" && (
        <AddSlidePanel sessionId={sessionId} orgSlug={orgSlug} bare />
      )}
      {tab === "quiz" && (
        <QuizTab
          sessionId={sessionId}
          orgSlug={orgSlug}
          quizPolls={quizPolls}
          initial={championship ?? { enabled: false, auto: true, reveal_duration: 10 }}
          sessionStatus={sessionStatus ?? "draft"}
        />
      )}
    </div>
  );
}
