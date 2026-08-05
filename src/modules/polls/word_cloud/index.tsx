"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { aggregate, type Aggregate } from "@/core/votes/aggregate";
import type {
  PollTypeModule, PollLiveCtx, PollParticipantProps, PollDisplayProps, PollHostResultProps, PollPresenterProps,
} from "@/core/modules/poll";

export type Config = Record<string, never>;
export type Live = { isNew: (word: string) => boolean };

function normalize(v: string) {
  return v.toLowerCase().trim();
}

function fromSettings(): Config {
  return {};
}

function aggregateVotes(votes: { value: string }[]): Aggregate {
  const result = aggregate(votes, { normalize });
  return { ...result, buckets: [...result.buckets].sort((a, b) => b.count - a.count) };
}

function useDisplayLive(ctx: PollLiveCtx): Live {
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    ctx.votes.forEach((v) => seenRef.current.add(normalize(v.value)));
  }, [ctx.votes]);
  // Deferred to Display's own render (not read here) — a ref read has to
  // happen somewhere for a "seen before" cache that must not itself trigger
  // a re-render (a state-based cache would force an extra commit shortly
  // after the fade-in class is applied, cutting the CSS animation short).
  return { isNew: (word) => !seenRef.current.has(word) };
}

function Participant({ disabled, onVote }: PollParticipantProps<Config>) {
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <input type="text" maxLength={30} placeholder="Введите слово или фразу..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onVote(value.trim()); }}
        className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg" />
      <Button className="w-full py-4 text-base" loading={disabled} disabled={!value.trim()}
        onClick={() => { if (value.trim()) onVote(value.trim()); }}>
        Отправить
      </Button>
    </div>
  );
}

function Display({ agg, live, accent }: PollDisplayProps<Config, Aggregate, Live>) {
  if (agg.buckets.length === 0) {
    return <p className="text-slate-500 text-xl text-center">Ожидаем ответы...</p>;
  }
  const vals = agg.buckets.map((b) => b.count);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 justify-center items-center max-h-80 overflow-y-auto p-4">
      {agg.buckets.map(({ name, count }) => {
        const scale = max === min ? 0.5 : (count - min) / (max - min);
        const isNew = live.isNew(name);
        return (
          <span key={name}
            style={{ fontSize: `${(1.5 + scale * 3.5).toFixed(2)}rem`, opacity: 0.55 + scale * 0.45, color: accent }}
            className={`font-bold leading-tight ${isNew ? "animate-fade-in" : ""}`}>
            {name}
          </span>
        );
      })}
    </div>
  );
}

function HostResult({ agg, t }: PollHostResultProps<Config, Aggregate>) {
  if (agg.buckets.length === 0) return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">{t("Org.session.pollList.noVotes")}</p>;
  const sorted = [...agg.buckets].sort((a, b) => b.count - a.count).slice(0, 12);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sorted.map(({ name, count }) => (
        <span key={name} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-300">
          {name}<span className="font-semibold">{count}</span>
        </span>
      ))}
    </div>
  );
}

function Presenter({ agg }: PollPresenterProps<Config, Aggregate>) {
  if (agg.buckets.length === 0) return null;
  const sorted = [...agg.buckets].sort((a, b) => b.count - a.count).slice(0, 12);
  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map(({ name, count }) => (
        <span key={name} className="rounded-full bg-indigo-900/50 border border-indigo-700/40 px-3 py-1 text-sm text-indigo-300">
          {name} <span className="font-semibold">{count}</span>
        </span>
      ))}
    </div>
  );
}

export const word_cloud: PollTypeModule<Config, Aggregate, Live> = {
  id: "word_cloud",
  meta: { icon: "☁️", labelKey: "Org.shared.pollTypeLabel.word_cloud", order: 1 },
  config: { fromSettings },
  aggregate: aggregateVotes,
  useDisplayLive,
  render: { participant: Participant, display: Display, hostResult: HostResult, presenter: Presenter },
};
