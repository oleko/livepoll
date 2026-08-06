"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { useChannel } from "@/core/realtime/useChannel";
import { aggregate, type Aggregate } from "@/core/votes/aggregate";
import type {
  PollTypeModule, PollLiveCtx, PollParticipantProps, PollDisplayProps, PollHostResultProps, PollPresenterProps,
} from "@/core/modules/poll";

export type Config = Record<string, never>;
export type Live = { revealed: boolean };

const POKER_VALUES = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];

function fromSettings(): Config {
  return {};
}

function aggregateVotes(votes: { value: string }[], _config: Config, opts?: { sortByPopularity?: boolean }): Aggregate {
  const result = aggregate(votes, { seedKeys: POKER_VALUES });
  if (!opts?.sortByPopularity) return result;
  return { ...result, buckets: [...result.buckets].sort((a, b) => b.count - a.count) };
}

function useDisplayLive(ctx: PollLiveCtx): Live {
  const [revealed, setRevealed] = useState(false);
  useChannel("sessionPolls", ctx.sessionId, {
    poker_reveal: () => setRevealed(true),
  });
  return { revealed };
}

function Participant({ disabled, onVote }: PollParticipantProps<Config>) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {POKER_VALUES.map((val) => (
        <button key={val} onClick={() => onVote(val)} disabled={disabled}
          className="aspect-[2/3] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-3xl font-bold text-slate-900 dark:text-white hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 transition-colors disabled:opacity-50 active:scale-95">
          {val}
        </button>
      ))}
    </div>
  );
}

function Display({ agg, live, accent, isDark }: PollDisplayProps<Config, Aggregate, Live>) {
  if (!live.revealed) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <p className="text-6xl">🃏</p>
        <p className="text-2xl text-slate-500 dark:text-slate-400">{agg.total} карт выбрано</p>
        <p className="text-base text-slate-400 dark:text-slate-500">Ведущий раскроет результаты</p>
      </div>
    );
  }
  if (agg.buckets.length === 0) return null;
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
          {agg.buckets.map((_entry, i) => (
            <Cell key={i} fill={accent} />
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

function Presenter({ agg }: PollPresenterProps<Config, Aggregate>) {
  const sorted = [...agg.buckets].sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map(({ name, count }) => (
        <span key={name} className="rounded-lg bg-purple-900/40 border border-purple-700/40 px-3 py-2 text-base font-bold text-purple-300">
          {name} <span className="text-xs font-normal text-purple-400">×{count}</span>
        </span>
      ))}
    </div>
  );
}

export const planning_poker: PollTypeModule<Config, Aggregate, Live> = {
  id: "planning_poker",
  meta: { icon: "🃏", labelKey: "Org.shared.pollTypeLabel.planning_poker", order: 5 },
  storage: "votes",
  config: { fromSettings },
  aggregate: aggregateVotes,
  useDisplayLive,
  render: { participant: Participant, display: Display, hostResult: HostResult, presenter: Presenter },
};
