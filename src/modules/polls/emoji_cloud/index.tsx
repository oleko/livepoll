"use client";

import { aggregate, type Aggregate } from "@/core/votes/aggregate";
import type {
  PollTypeModule, PollParticipantProps, PollDisplayProps, PollHostResultProps, PollPresenterProps,
} from "@/core/modules/poll";

export type Config = Record<string, never>;

const EMOJI_OPTIONS = ["😊", "🔥", "👍", "❤️", "🎉", "😮", "🤔", "👎"];

function fromSettings(): Config {
  return {};
}

function aggregateVotes(votes: { value: string }[]): Aggregate {
  const result = aggregate(votes, {});
  return { ...result, buckets: [...result.buckets].sort((a, b) => b.count - a.count) };
}

function Participant({ disabled, onVote }: PollParticipantProps<Config>) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {EMOJI_OPTIONS.map((emoji) => (
        <button key={emoji} onClick={() => onVote(emoji)} disabled={disabled}
          className="text-4xl aspect-square flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/10 transition-colors disabled:opacity-50 active:scale-95">
          {emoji}
        </button>
      ))}
    </div>
  );
}

function Display({ agg }: PollDisplayProps<Config, Aggregate, void>) {
  if (agg.buckets.length === 0) {
    return <p className="text-slate-500 text-xl text-center">Ожидаем ответы...</p>;
  }
  const max = Math.max(...agg.buckets.map((b) => b.count));
  const sorted = agg.buckets.slice(0, 12);
  return (
    <>
      <style>{`@keyframes emojiFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-14px) rotate(4deg)}}`}</style>
      <div className="flex flex-wrap gap-6 justify-center items-center min-h-40 py-4">
        {sorted.map(({ name, count }, i) => {
          const scale = max <= 1 ? 0.4 : (count - 1) / (max - 1);
          return (
            <span key={name} title={`${count}`}
              style={{
                fontSize: `${(3 + scale * 5).toFixed(2)}rem`,
                animation: `emojiFloat ${(2.2 + (i % 5) * 0.4).toFixed(1)}s ease-in-out infinite`,
                animationDelay: `${((i * 0.25) % 1.5).toFixed(2)}s`,
                display: "inline-block",
                lineHeight: 1,
              }}>
              {name}
            </span>
          );
        })}
      </div>
    </>
  );
}

function HostResult({ agg, t }: PollHostResultProps<Config, Aggregate>) {
  if (agg.buckets.length === 0) return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">{t("Org.session.pollList.noVotes")}</p>;
  const sorted = [...agg.buckets].sort((a, b) => b.count - a.count);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {sorted.map(({ name, count }) => (
        <span key={name} className="flex items-center gap-1 text-sm">
          {name}<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{count}</span>
        </span>
      ))}
    </div>
  );
}

function Presenter({ agg, total }: PollPresenterProps<Config, Aggregate>) {
  if (total === 0) return null;
  return (
    <div className="flex gap-6 text-2xl font-bold flex-wrap">
      {[...agg.buckets].sort((a, b) => b.count - a.count).slice(0, 8).map(({ name, count }) => (
        <span key={name} className="text-slate-200">{name} <span className="text-slate-400 text-base font-normal">×{count}</span></span>
      ))}
    </div>
  );
}

export const emoji_cloud: PollTypeModule<Config, Aggregate, void> = {
  id: "emoji_cloud",
  meta: { icon: "😊", labelKey: "Org.shared.pollTypeLabel.emoji_cloud", order: 2 },
  storage: "votes",
  config: { fromSettings },
  aggregate: aggregateVotes,
  render: { participant: Participant, display: Display, hostResult: HostResult, presenter: Presenter },
};
