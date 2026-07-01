"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { NewPollForm } from "./NewPollForm";
import { AddSlidePanel } from "./AddSlidePanel";
import { QuizTab } from "./QuizTab";
import { QAPanel } from "./QAPanel";

type SectionItem = { id: string; title: string };
type QuizPoll = { id: string; title: string; settings?: Record<string, unknown> | null };
type Question = { id: string; text: string; status: "pending" | "answered" | "hidden"; upvotes: number; created_at: string };

export function CreationTabs({
  sessionId,
  orgSlug,
  sections,
  quizPolls = [],
  championship,
  sessionStatus,
  initialQuestions = [],
}: {
  sessionId: string;
  orgSlug: string;
  sections: SectionItem[];
  quizPolls?: QuizPoll[];
  championship?: { enabled: boolean; auto: boolean; reveal_duration: number };
  sessionStatus?: "draft" | "active" | "ended";
  initialQuestions?: Question[];
}) {
  const t = useTranslations("Org.session.creationTabs");
  const [tab, setTab] = useState<"poll" | "slide" | "quiz" | "qa">("poll");

  const tabs = [
    { key: "poll" as const,  label: t("pollTab")  },
    { key: "slide" as const, label: t("slideTab") },
    { key: "quiz" as const,  label: t("quizTab")  },
    { key: "qa" as const,    label: t("qaTab")    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 text-sm font-medium py-2.5 rounded-md transition-colors ${
              tab === key
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
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
      {tab === "qa" && (
        <QAPanel
          sessionId={sessionId}
          orgSlug={orgSlug}
          initialQuestions={initialQuestions}
        />
      )}
    </div>
  );
}
