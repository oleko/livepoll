"use client";

import { useState } from "react";
import { useChannel } from "@/core/realtime/useChannel";
import { aggregate, type Aggregate } from "@/core/votes/aggregate";
import { parsePollSettings } from "@/core/settings/pollSettings";
import type { QuestionRow } from "@/core/domain/question";
import { Button } from "@/components/ui/Button";
import type {
  PollTypeModule, PollLiveCtx, PollParticipantProps, PollDisplayProps, PollHostResultProps,
} from "@/core/modules/poll";

export type Config = { maxQuestions: number };
export type Live = { pinned: QuestionRow | null };

function fromSettings(poll: { options: unknown; settings: unknown }): Config {
  const s = parsePollSettings(poll.settings);
  return { maxQuestions: s.max_questions ?? 1 };
}

function aggregateVotes(votes: { value: string }[]): Aggregate {
  return aggregate(votes, {});
}

function useDisplayLive(ctx: PollLiveCtx): Live {
  const [pinned, setPinned] = useState<QuestionRow | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = sessionStorage.getItem(`pinned-q-${ctx.sessionId}`);
      if (!saved) return null;
      const id = JSON.parse(saved) as string;
      return ctx.questions.find((q) => q.id === id) ?? null;
    } catch { return null; }
  });

  useChannel("sessionQuestions", ctx.sessionId, {
    question_change: (data) => {
      if (data.type === "pinned") {
        setPinned(data.pinned);
        try {
          if (data.pinned) sessionStorage.setItem(`pinned-q-${ctx.sessionId}`, JSON.stringify(data.pinned.id));
          else sessionStorage.removeItem(`pinned-q-${ctx.sessionId}`);
        } catch {}
      } else if (data.type === "updated") {
        setPinned((prev) => (prev?.id === data.question.id ? data.question : prev));
      }
    },
  });

  return { pinned };
}

function Participant({
  config, disabled, onVote, title, questions = [], upvotedIds = new Set<string>(), onUpvote, submittedCount = 0,
}: PollParticipantProps<Config>) {
  const [text, setText] = useState("");
  const remaining = config.maxQuestions - submittedCount;

  if (remaining <= 0) {
    return (
      <div className="text-center px-6">
        <div className="text-6xl mb-5">📩</div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          {submittedCount === 1 ? "Вопрос отправлен!" : `Отправлено ${submittedCount} вопроса`}
        </p>
        <p className="text-slate-500 text-sm">Ожидайте ответа ведущего</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2 leading-snug px-2">
        {title}
      </h2>
      {submittedCount > 0 && (
        <p className="text-center text-sm text-green-600 dark:text-green-400 mb-4">
          ✓ Вопрос отправлен. Можно задать ещё {remaining}.
        </p>
      )}
      <div className="flex flex-col gap-3 mt-4">
        <textarea
          rows={4}
          maxLength={300}
          placeholder="Введите ваш вопрос..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">макс. 300 символов</span>
          {config.maxQuestions > 1 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">{submittedCount}/{config.maxQuestions} вопросов</span>
          )}
        </div>
        <Button
          className="w-full py-4 text-base"
          loading={disabled}
          onClick={() => { if (text.trim()) { onVote(text.trim()); setText(""); } }}
        >
          Задать вопрос
        </Button>
      </div>
      {questions.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Вопросы аудитории</p>
          {[...questions].sort((a, b) => b.upvotes - a.upvotes).map((q) => (
            <div key={q.id} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
              <button
                onClick={() => onUpvote?.(q.id)}
                disabled={upvotedIds.has(q.id)}
                className={`flex flex-col items-center gap-0.5 shrink-0 rounded-lg px-2 py-1 text-sm font-semibold transition-colors ${
                  upvotedIds.has(q.id)
                    ? "text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                    : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                }`}
              >
                <span className="text-base leading-none">▲</span>
                <span className="text-xs">{q.upvotes}</span>
              </button>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug pt-1">{q.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Display({ live }: PollDisplayProps<Config, Aggregate, Live>) {
  const pinned = live.pinned;
  return (
    <div className="flex items-center justify-center min-h-40">
      {!pinned ? (
        <p className="text-slate-500 text-xl text-center">Ведущий выберет вопрос для отображения</p>
      ) : (
        <div className="w-full max-w-2xl">
          <div className={`rounded-2xl border px-10 py-8 text-center ${
            pinned.status === "answered" ? "border-green-500/40 bg-green-500/5" : "border-indigo-500/40 bg-indigo-500/5"
          }`}>
            <p className="text-slate-900 dark:text-white text-3xl font-medium leading-relaxed">{pinned.text}</p>
            <div className="flex items-center justify-center gap-4 mt-5">
              {pinned.upvotes > 0 && (
                <span className="text-indigo-400 text-base">▲ {pinned.upvotes}</span>
              )}
              {pinned.status === "answered" && (
                <span className="text-green-400 text-base">✓ Отвечен</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HostResult({ total, t }: PollHostResultProps<Config, Aggregate>) {
  return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">{t("Org.session.pollList.questionsReceived", { count: total })}</p>;
}

export const qa: PollTypeModule<Config, Aggregate, Live> = {
  id: "qa",
  meta: { icon: "❓", labelKey: "Org.shared.pollTypeLabel.qa", order: 6 },
  storage: "questions",
  config: { fromSettings },
  aggregate: aggregateVotes,
  useDisplayLive,
  render: { participant: Participant, display: Display, hostResult: HostResult },
};
