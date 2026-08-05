"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { aggregate, type Aggregate } from "@/core/votes/aggregate";
import { parsePollSettings } from "@/core/settings/pollSettings";
import type { QuizReveal } from "@/core/domain/poll";
import type {
  PollTypeModule, PollLiveCtx, PollParticipantProps, PollDisplayProps, PollHostResultProps, PollPresenterProps,
} from "@/core/modules/poll";

export type Config = {
  options: string[];
  maxAnswers: number;
  quizMode: boolean;
  correctOption?: string;
  explanation?: string;
};

export type Live = { reveal: QuizReveal | null };

function fromSettings(poll: { options: unknown; settings: unknown }): Config {
  const options = Array.isArray(poll.options) ? (poll.options as string[]) : [];
  const s = parsePollSettings(poll.settings);
  return {
    options,
    maxAnswers: s.max_answers ?? 1,
    quizMode: !!s.quiz_mode,
    correctOption: s.correct_option,
    explanation: s.explanation,
  };
}

function aggregateVotes(votes: { value: string }[], config: Config, opts?: { sortByPopularity?: boolean }): Aggregate {
  const result = aggregate(votes, { seedKeys: config.options, keepZero: true });
  if (!opts?.sortByPopularity) return result;
  return { ...result, buckets: [...result.buckets].sort((a, b) => b.count - a.count) };
}

function useDisplayLive(ctx: PollLiveCtx): Live {
  return { reveal: ctx.quizReveal };
}

function Participant({ config, disabled, onVote }: PollParticipantProps<Config>) {
  const { options, maxAnswers } = config;
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  if (maxAnswers === 1) {
    return (
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <button key={opt} onClick={() => onVote(opt)} disabled={disabled}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/10 text-slate-900 dark:text-white text-left px-5 py-4 text-base font-medium transition-colors disabled:opacity-50 active:scale-[0.98]">
            {opt}
          </button>
        ))}
      </div>
    );
  }

  const toggle = (opt: string) =>
    setSelectedOptions((prev) =>
      prev.includes(opt)
        ? prev.filter((o) => o !== opt)
        : prev.length < maxAnswers
          ? [...prev, opt]
          : prev
    );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Выберите до {maxAnswers} вариантов
        {selectedOptions.length > 0 && (
          <span className="ml-1 font-semibold text-indigo-500 dark:text-indigo-400">
            · выбрано {selectedOptions.length}
          </span>
        )}
      </p>
      {options.map((opt) => {
        const isSelected = selectedOptions.includes(opt);
        const isDisabled = disabled || (!isSelected && selectedOptions.length >= maxAnswers);
        return (
          <button key={opt} onClick={() => toggle(opt)} disabled={isDisabled}
            className={`w-full rounded-xl border px-5 py-4 text-base font-medium text-left flex items-center justify-between transition-colors active:scale-[0.98] disabled:opacity-40 ${
              isSelected
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-600/5"
            }`}>
            <span>{opt}</span>
            {isSelected && <span className="text-indigo-500 dark:text-indigo-400 shrink-0 ml-2">✓</span>}
          </button>
        );
      })}
      <button
        onClick={() => onVote(JSON.stringify(selectedOptions))}
        disabled={selectedOptions.length === 0 || disabled}
        className="w-full py-4 text-base mt-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        Подтвердить ({selectedOptions.length}/{maxAnswers})
      </button>
    </div>
  );
}

function Display({ agg, live, accent, isDark }: PollDisplayProps<Config, Aggregate, Live>) {
  if (agg.buckets.length === 0) return null;
  const reveal = live.reveal;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={agg.buckets} margin={{ top: 36, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 15 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: isDark ? "#1e293b" : "#ffffff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: 8 }}
          labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
          itemStyle={{ color: "#818cf8" }}
        />
        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
          {agg.buckets.map((entry, i) => (
            <Cell key={i} fill={reveal ? (entry.name === reveal.correct_option ? "#22c55e" : "#94a3b8") : accent} />
          ))}
          <LabelList
            dataKey="count"
            content={(props) => {
              const { x, y, width, value } = props as { x: number; y: number; width: number; value: number };
              if (!value) return null;
              const pct = agg.total > 0 ? Math.round((value / agg.total) * 100) : 0;
              return (
                <text x={x + width / 2} y={y - 8} textAnchor="middle" fill={isDark ? "#e2e8f0" : "#1e293b"} fontSize={14} fontWeight={600}>
                  {value} · {pct}%
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HostResult({ agg, total, t }: PollHostResultProps<Config, Aggregate>) {
  if (total === 0) return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">{t("Org.session.pollList.noVotes")}</p>;
  const sorted = [...agg.buckets].sort((a, b) => b.count - a.count).slice(0, 5);
  return (
    <div className="mt-2 space-y-1">
      {sorted.map(({ name, count }) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{name}</span>
          <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(count / total) * 100}%` }} />
          </div>
          <span className="text-slate-400 dark:text-slate-600 shrink-0 w-6 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

function Presenter({ agg, total }: PollPresenterProps<Config, Aggregate>) {
  const sorted = [...agg.buckets].sort((a, b) => b.count - a.count).slice(0, 6);
  if (sorted.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {sorted.map(({ name, count }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={name} className="flex items-center gap-2 text-sm">
            <span className="w-40 truncate text-slate-300 shrink-0">{name}</span>
            <div className="flex-1 h-3 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-slate-400 tabular-nums text-xs shrink-0">{count}</span>
            <span className="w-8 text-right text-slate-500 tabular-nums text-xs shrink-0">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export const multiple_choice: PollTypeModule<Config, Aggregate, Live> = {
  id: "multiple_choice",
  meta: { icon: "📊", labelKey: "Org.shared.pollTypeLabel.multiple_choice", order: 0 },
  config: { fromSettings },
  aggregate: aggregateVotes,
  useDisplayLive,
  render: { participant: Participant, display: Display, hostResult: HostResult, presenter: Presenter },
};
