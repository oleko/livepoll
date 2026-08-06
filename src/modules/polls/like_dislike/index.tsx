"use client";

import { aggregate, type Aggregate } from "@/core/votes/aggregate";
import type {
  PollTypeModule, PollParticipantProps, PollDisplayProps, PollHostResultProps, PollPresenterProps,
} from "@/core/modules/poll";

export type Config = Record<string, never>;

function fromSettings(): Config {
  return {};
}

function aggregateVotes(votes: { value: string }[]): Aggregate {
  return aggregate(votes, { seedKeys: ["like", "dislike"], keepZero: true });
}

function Participant({ disabled, onVote }: PollParticipantProps<Config>) {
  return (
    <div className="flex justify-center gap-10">
      {[["👍", "like"], ["👎", "dislike"]].map(([emoji, val]) => (
        <button key={val} onClick={() => onVote(val)} disabled={disabled}
          className="flex flex-col items-center gap-2 disabled:opacity-50">
          <span className="text-7xl hover:scale-110 transition-transform duration-150 active:scale-110 inline-block">{emoji}</span>
        </button>
      ))}
    </div>
  );
}

function Display({ agg }: PollDisplayProps<Config, Aggregate, void>) {
  return (
    <div className="flex justify-center gap-24">
      {[["👍", "like"], ["👎", "dislike"]].map(([emoji, val]) => (
        <div key={val} className="text-center">
          <div className="text-8xl mb-4">{emoji}</div>
          <div className="text-6xl font-bold text-slate-900 dark:text-white">{agg.counts[val] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

function HostResult({ agg, total }: PollHostResultProps<Config, Aggregate>) {
  const likes = agg.counts["like"] ?? 0;
  const dislikes = agg.counts["dislike"] ?? 0;
  const pct = total > 0 ? Math.round((likes / total) * 100) : 0;
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="text-green-500">👍 {likes}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-red-400">👎 {dislikes}</span>
    </div>
  );
}

function Presenter({ agg }: PollPresenterProps<Config, Aggregate>) {
  return (
    <div className="flex gap-6 text-2xl font-bold">
      <span className="text-green-400">👍 {agg.counts["like"] ?? 0}</span>
      <span className="text-red-400">👎 {agg.counts["dislike"] ?? 0}</span>
    </div>
  );
}

export const like_dislike: PollTypeModule<Config, Aggregate, void> = {
  id: "like_dislike",
  meta: { icon: "👍", labelKey: "Org.shared.pollTypeLabel.like_dislike", order: 4 },
  config: { fromSettings },
  aggregate: aggregateVotes,
  render: { participant: Participant, display: Display, hostResult: HostResult, presenter: Presenter },
};
