"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { aggregate, type Aggregate } from "@/core/votes/aggregate";
import type { QuestionRow } from "@/core/domain/question";
import type {
  PollTypeModule, PollLiveCtx, PollParticipantProps, PollDisplayProps, PollHostResultProps,
} from "@/core/modules/poll";

export type Config = Record<string, never>;
export type Live = { visibleQuestions: QuestionRow[] };

const CARD_COLORS = [
  "border-indigo-500/30 bg-indigo-500/10",
  "border-purple-500/30 bg-purple-500/10",
  "border-cyan-500/30 bg-cyan-500/10",
  "border-emerald-500/30 bg-emerald-500/10",
  "border-amber-500/30 bg-amber-500/10",
];

function fromSettings(): Config {
  return {};
}

function aggregateVotes(votes: { value: string }[]): Aggregate {
  return aggregate(votes, {});
}

function useDisplayLive(ctx: PollLiveCtx): Live {
  return {
    visibleQuestions: [...ctx.questions].filter((q) => q.status !== "hidden").sort((a, b) => b.upvotes - a.upvotes),
  };
}

function IdeaWallForm({ disabled, onVote, title, hasSubmitted }: {
  disabled: boolean;
  onVote: (value: string) => void;
  title?: string;
  hasSubmitted: boolean;
}) {
  const [showForm, setShowForm] = useState(!hasSubmitted);
  const [text, setText] = useState("");

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2 leading-snug px-2">
        {title}
      </h2>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
        Поделитесь своей идеей — она появится на экране
      </p>
      {!showForm ? (
        <div className="text-center">
          <div className="text-6xl mb-4">💡</div>
          <p className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Идея отправлена!</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">Ваша идея уже видна на экране</p>
          <Button variant="secondary" className="text-sm" onClick={() => setShowForm(true)}>
            Отправить ещё
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            rows={3}
            maxLength={200}
            placeholder="Введите вашу идею..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base"
          />
          <Button
            className="w-full py-4 text-base"
            onClick={() => { if (text.trim()) onVote(text.trim()); }}
            loading={disabled}
            disabled={!text.trim()}
          >
            Отправить идею
          </Button>
        </div>
      )}
    </div>
  );
}

function Participant({ disabled, onVote, title, submittedCount = 0 }: PollParticipantProps<Config>) {
  // Keyed by submittedCount: each confirmed submission remounts back to the
  // "submitted" state fresh, while "Отправить ещё" toggles local state
  // in between without needing a new submission to flip it.
  return <IdeaWallForm key={submittedCount} disabled={disabled} onVote={onVote} title={title} hasSubmitted={submittedCount > 0} />;
}

function Display({ live }: PollDisplayProps<Config, Aggregate, Live>) {
  const { visibleQuestions } = live;
  if (visibleQuestions.length === 0) {
    return <p className="text-slate-500 text-xl text-center py-12">Ожидаем идеи от участников...</p>;
  }
  return (
    <div className="columns-2 lg:columns-3 gap-4 max-h-[55vh] overflow-y-auto p-1">
      {visibleQuestions.map((q, i) => (
        <div key={q.id} className={`break-inside-avoid rounded-2xl border p-5 mb-4 ${CARD_COLORS[i % CARD_COLORS.length]}`}>
          <p className="text-white text-lg leading-snug">{q.text}</p>
          {q.upvotes > 0 && (
            <p className="text-slate-400 text-sm mt-2">▲ {q.upvotes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function HostResult({ total, t }: PollHostResultProps<Config, Aggregate>) {
  return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">{t("Org.session.pollList.questionsReceived", { count: total })}</p>;
}

export const idea_wall: PollTypeModule<Config, Aggregate, Live> = {
  id: "idea_wall",
  meta: { icon: "💡", labelKey: "Org.shared.pollTypeLabel.idea_wall", order: 7 },
  storage: "questions",
  config: { fromSettings },
  aggregate: aggregateVotes,
  useDisplayLive,
  render: { participant: Participant, display: Display, hostResult: HostResult },
};
