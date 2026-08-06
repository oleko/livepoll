"use client";

import { aggregate, type Aggregate } from "@/core/votes/aggregate";
import type {
  PollTypeModule, PollParticipantProps, PollDisplayProps, PollHostResultProps, PollPresenterProps,
} from "@/core/modules/poll";

export type Config = Record<string, never>;

const TEMP_LABELS = ["❄️", "🥶", "😐", "🌡️", "🔥"];
const TEMP_KEYS = ["1", "2", "3", "4", "5"];

function fromSettings(): Config {
  return {};
}

function aggregateVotes(votes: { value: string }[]): Aggregate {
  return aggregate(votes, { seedKeys: TEMP_KEYS, keepZero: true });
}

function average(agg: Aggregate): number {
  if (agg.total === 0) return 0;
  const sum = Object.entries(agg.counts).reduce((s, [v, c]) => s + parseFloat(v) * c, 0);
  return sum / agg.total;
}

function Participant({ disabled, onVote }: PollParticipantProps<Config>) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4 justify-center">
        {TEMP_LABELS.map((emoji, i) => (
          <button key={i} onClick={() => onVote(String(i + 1))} disabled={disabled}
            className="text-5xl hover:scale-110 transition-transform duration-150 disabled:opacity-50 active:scale-110">
            {emoji}
          </button>
        ))}
      </div>
      <div className="flex justify-between w-full text-sm text-slate-500 px-1">
        <span>Холодно</span><span>Горячо</span>
      </div>
    </div>
  );
}

function Display({ agg }: PollDisplayProps<Config, Aggregate, void>) {
  return (
    <div className="flex justify-center gap-8">
      {TEMP_LABELS.map((emoji, i) => (
        <div key={i} className="text-center">
          <div className="text-6xl mb-3">{emoji}</div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white">{agg.counts[TEMP_KEYS[i]] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

function HostResult({ agg, total }: PollHostResultProps<Config, Aggregate>) {
  if (total === 0) return null;
  const avg = average(agg);
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(avg / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">{avg.toFixed(1)} / 5</span>
    </div>
  );
}

function Presenter({ agg, total }: PollPresenterProps<Config, Aggregate>) {
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-4xl font-bold text-indigo-400">{Math.round(average(agg) * 10) / 10}</span>
      <span className="text-slate-400">средняя оценка</span>
    </div>
  );
}

export const temperature: PollTypeModule<Config, Aggregate, void> = {
  id: "temperature",
  meta: { icon: "🌡", labelKey: "Org.shared.pollTypeLabel.temperature", order: 3 },
  config: { fromSettings },
  aggregate: aggregateVotes,
  render: { participant: Participant, display: Display, hostResult: HostResult, presenter: Presenter },
};
