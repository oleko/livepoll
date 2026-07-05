"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createPoll } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/Dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/Collapsible";
import { Checkbox } from "@/components/ui/Checkbox";
import type { PollType } from "@/types/database";
import { POLL_TEMPLATE_CATEGORIES } from "@/lib/poll-templates";

type SectionItem = { id: string; title: string };

const POLL_TYPES: { value: PollType; hasOptions: boolean; icon: string }[] = [
  { value: "multiple_choice", hasOptions: true,  icon: "📊" },
  { value: "temperature",     hasOptions: false, icon: "🌡️" },
  { value: "like_dislike",    hasOptions: false, icon: "👍" },
  { value: "word_cloud",      hasOptions: false, icon: "☁️" },
  { value: "emoji_cloud",     hasOptions: false, icon: "😊" },
  { value: "planning_poker",  hasOptions: false, icon: "🃏" },
  { value: "qa",              hasOptions: false, icon: "❓" },
  { value: "idea_wall",       hasOptions: false, icon: "💡" },
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
  const [allowRevote, setAllowRevote] = useState(false);
  const [correctOption, setCorrectOption] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="org_slug" value={orgSlug} />
      {/* Hidden inputs for Radix-controlled checkboxes */}
      <input type="hidden" name="quiz_mode" value={quizMode ? "on" : ""} />
      <input type="hidden" name="allow_revote" value={allowRevote ? "on" : ""} />

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
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors self-start"
      >
        <span>📚</span>
        {t("templateTrigger")}
      </button>

      {/* Template modal — Radix Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("templateModalTitle")}</DialogTitle>
            <DialogClose className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              ✕
            </DialogClose>
          </DialogHeader>

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
              const pt = POLL_TYPES.find(p => p.value === tpl.type);
              return (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="flex items-start gap-3 w-full px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <span className="text-xl leading-none mt-0.5 shrink-0">{pt?.icon ?? "📊"}</span>
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
        </DialogContent>
      </Dialog>

      {/* — Type picker: icon grid — */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {t("typeLabel")}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {POLL_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => {
                setType(pt.value);
                if (pt.value !== "multiple_choice") setQuizMode(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                type === pt.value
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-slate-900 dark:text-white"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="text-base leading-none shrink-0">{pt.icon}</span>
              <span className="text-xs font-semibold leading-tight">{tShared(`pollTypeLabel.${pt.value}`)}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      {/* — Content: question + options — */}
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

      {/* — Advanced settings — Radix Collapsible — */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span>{t("advancedSettings")}</span>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-150 ${advancedOpen ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-3 mt-2">

          {/* Timer */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">{t("timerLabel")}</label>
            <select
              name="duration"
              defaultValue="0"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          {/* Max answers — multiple_choice only */}
          {type === "multiple_choice" && (
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">{t("maxAnswersLabel")}</label>
              <select
                name="max_answers"
                defaultValue="1"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n === 1 ? t("singleOption") : t("upToN", { n })}</option>
                ))}
              </select>
            </div>
          )}

          {/* Vote limit */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">{t("voteLimitLabel")}</label>
            <div className="flex items-center gap-2">
              <input
                name="vote_limit"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue="0"
                className="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{t("voteLimitHint")}</span>
            </div>
          </div>

          {/* Questions per participant — qa only */}
          {type === "qa" && (
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">{t("questionsPerParticipant")}</label>
              <select
                name="max_questions"
                defaultValue="1"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[1,2,3,5,10].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}

          {/* Allow revote — Radix Checkbox */}
          {type !== "qa" && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={allowRevote}
                onCheckedChange={(v) => setAllowRevote(v === true)}
                aria-label={t("allowRevote")}
              />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("allowRevote")}</span>
            </label>
          )}

          {/* Quiz mode — Radix Checkbox, multiple_choice only */}
          {type === "multiple_choice" && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={quizMode}
                onCheckedChange={(v) => setQuizMode(v === true)}
                aria-label={t("quizModeLabel")}
              />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("quizModeLabel")}</span>
            </label>
          )}

          {/* Quiz sub-panel */}
          {quizMode && type === "multiple_choice" && (
            <div className="flex flex-col gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t("correctAnswerLabel")}</label>
                <select
                  name="correct_option"
                  value={correctOption}
                  onChange={(e) => setCorrectOption(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t("correctAnswerPlaceholder")}</option>
                  {parsedOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {t("explanationLabel")} <span className="font-normal text-slate-400">{t("explanationOptional")}</span>
                </label>
                <textarea
                  name="explanation"
                  rows={2}
                  maxLength={200}
                  placeholder={t("explanationPlaceholder")}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Button type="submit" loading={isPending} className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}
