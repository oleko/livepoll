"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createPoll } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PollType } from "@/types/database";
import { POLL_TEMPLATE_CATEGORIES } from "@/lib/poll-templates";

type SectionItem = { id: string; title: string };

const POLL_TYPES: { value: PollType; hasOptions: boolean }[] = [
  { value: "multiple_choice", hasOptions: true },
  { value: "temperature",     hasOptions: false },
  { value: "like_dislike",    hasOptions: false },
  { value: "word_cloud",      hasOptions: false },
  { value: "emoji_cloud",     hasOptions: false },
  { value: "planning_poker",  hasOptions: false },
  { value: "qa",              hasOptions: false },
  { value: "idea_wall",       hasOptions: false },
];

export function NewPollForm({
  sessionId,
  orgSlug,
  sections = [],
}: {
  sessionId: string;
  orgSlug: string;
  sections?: SectionItem[];
}) {
  const t = useTranslations("Org.session.newPollForm");
  const tShared = useTranslations("Org.shared");
  const [type, setType] = useState<PollType>("multiple_choice");
  const [optionsText, setOptionsText] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [quizMode, setQuizMode] = useState(false);
  const [correctOption, setCorrectOption] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeCategory, setActiveCategory] = useState(POLL_TEMPLATE_CATEGORIES[0].id);
  const [state, action, isPending] = useActionState(createPoll, null);

  const parsedOptions = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
  const selectedType = POLL_TYPES.find((pt) => pt.value === type)!;

  function applyTemplate(tpl: typeof POLL_TEMPLATE_CATEGORIES[number]["templates"][number]) {
    setType(tpl.type);
    setTitleValue(tpl.title);
    setOptionsText(tpl.options.join("\n"));
    setQuizMode(tpl.quiz_mode ?? false);
    setCorrectOption(tpl.correct_option ?? "");
    setShowTemplates(false);
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="org_slug" value={orgSlug} />

      {state && "error" in state && (
        <p className="text-xs text-red-500 dark:text-red-400">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-xs text-green-600 dark:text-green-400">{t("success")}</p>
      )}

      {/* Template trigger */}
      <button
        type="button"
        onClick={() => setShowTemplates(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
      >
        <span>📚</span>
        {t("templateTrigger")}
      </button>

      {/* Template modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-modal-in"
               style={{ maxHeight: "80vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("templateModalTitle")}</h2>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              {POLL_TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Templates list */}
            <div className="overflow-y-auto flex-1">
              {POLL_TEMPLATE_CATEGORIES.find((c) => c.id === activeCategory)?.templates.map((tpl) => {
                const icon =
                  tpl.type === "multiple_choice" ? "📊" :
                  tpl.type === "temperature"     ? "🌡️" :
                  tpl.type === "word_cloud"      ? "☁️" :
                  tpl.type === "like_dislike"    ? "👍" :
                  tpl.type === "emoji_cloud"     ? "😊" :
                  tpl.type === "planning_poker"  ? "🃏" : "❓";
                return (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="flex items-start gap-3 w-full px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <span className="text-xl leading-none mt-0.5 shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{tpl.title}</p>
                      {tpl.quiz_mode && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{t("quizBadge")}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("typeLabel")}</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as PollType)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {POLL_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>{tShared(`pollTypeLabel.${pt.value}`)}</option>
          ))}
        </select>
      </div>

      <Input
        label={t("questionLabel")}
        name="title"
        placeholder={t("questionPlaceholder")}
        value={titleValue}
        onChange={(e) => setTitleValue(e.target.value)}
        required
      />

      {selectedType.hasOptions && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("optionsLabel")}
            <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">{t("optionsHint")}</span>
          </label>
          <textarea
            name="options"
            rows={4}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={t("optionsPlaceholder")}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("timerLabel")}</label>
        <select
          name="duration"
          defaultValue="0"
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="0">{t("noTimer")}</option>
          <option value="30">{t("sec30")}</option>
          <option value="60">{t("min1")}</option>
          <option value="120">{t("min2")}</option>
          <option value="180">{t("min3")}</option>
          <option value="300">{t("min5")}</option>
          <option value="600">{t("min10")}</option>
        </select>
      </div>

      {type === "multiple_choice" && (
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
            {t("maxAnswersLabel")}
          </label>
          <div className="flex items-center gap-2">
            <select
              name="max_answers"
              defaultValue="1"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1,2,3,4,5].map(n => (
                <option key={n} value={n}>{n === 1 ? t("singleOption") : t("upToN", { n })}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{t("maxLabel")}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
          {t("voteLimitLabel")}
        </label>
        <div className="flex items-center gap-2">
          <input
            name="vote_limit"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue="0"
            className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{t("voteLimitHint")}</span>
        </div>
      </div>

      {type !== "qa" && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            name="allow_revote"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-indigo-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{t("allowRevote")}</span>
        </label>
      )}

      {type === "multiple_choice" && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="quiz_mode"
            checked={quizMode}
            onChange={(e) => setQuizMode(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-indigo-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{t("quizModeLabel")}</span>
        </label>
      )}

      {quizMode && type === "multiple_choice" && (
        <div className="flex flex-col gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("correctAnswerLabel")}</label>
            <select
              name="correct_option"
              value={correctOption}
              onChange={(e) => setCorrectOption(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("correctAnswerPlaceholder")}</option>
              {parsedOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("explanationLabel")} <span className="font-normal text-slate-400">{t("explanationOptional")}</span></label>
            <textarea
              name="explanation"
              rows={2}
              maxLength={200}
              placeholder={t("explanationPlaceholder")}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>
      )}

      {type === "qa" && (
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
            {t("questionsPerParticipant")}
          </label>
          <div className="flex items-center gap-2">
            <select
              name="max_questions"
              defaultValue="1"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1,2,3,5,10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{t("maxLabel")}</span>
          </div>
        </div>
      )}

      <Button type="submit" loading={isPending} className="w-full mt-1">
        {t("submit")}
      </Button>
    </form>
  );
}
