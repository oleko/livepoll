"use client";

import { useState, useRef, useEffect } from "react";
import { activatePoll, closePoll, copyPoll } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import type { Poll, SessionStatus } from "@/types/database";

type CopyTarget = { id: string; title: string; status: string };

function CopyPollButton({
  pollId,
  orgSlug,
  targets,
}: {
  pollId: string;
  orgSlug: string;
  targets: CopyTarget[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handle(targetId: string) {
    setPending(targetId);
    await copyPoll(pollId, targetId, orgSlug);
    setPending(null);
    setDone(targetId);
    setTimeout(() => { setDone(null); setOpen(false); }, 1200);
  }

  const STATUS_LABEL: Record<string, string> = { draft: "Черновик", active: "Идёт" };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Скопировать в другое мероприятие"
        className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs"
      >
        ⎘
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/40 dark:shadow-slate-950/60 overflow-hidden">
          <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
            Скопировать в:
          </p>
          {targets.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!!pending}
              onClick={() => handle(t.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">
                {t.title}
              </span>
              {done === t.id ? (
                <span className="text-xs font-semibold text-green-500 shrink-0">✓</span>
              ) : pending === t.id ? (
                <span className="text-xs text-slate-400 shrink-0">…</span>
              ) : (
                <span className="text-[11px] text-slate-400 shrink-0">
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_LABEL: Record<Poll["type"], string> = {
  multiple_choice: "Множественный выбор",
  temperature:     "Шкала температуры",
  qa:              "Q&A",
  like_dislike:    "Лайк / Дизлайк",
  word_cloud:      "Облако слов",
  emoji_cloud:     "Облако эмодзи",
  planning_poker:  "Planning Poker",
};

const TYPE_ICON: Record<Poll["type"], string> = {
  multiple_choice: "📊",
  temperature:     "🌡️",
  qa:              "❓",
  like_dislike:    "👍",
  word_cloud:      "☁️",
  emoji_cloud:     "😊",
  planning_poker:  "🃏",
};

type PollRow = Pick<Poll, "id" | "title" | "type" | "status" | "sort_order"> & {
  options: unknown[];
};

function PollResults({
  poll,
  valueCounts,
  total,
}: {
  poll: PollRow;
  valueCounts: Record<string, number>;
  total: number;
}) {
  if (total === 0) {
    return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">Голосов нет</p>;
  }

  if (poll.type === "qa") {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">
        Вопросов получено: {total}
      </p>
    );
  }

  if (poll.type === "temperature") {
    const sum = Object.entries(valueCounts).reduce(
      (s, [v, c]) => s + parseFloat(v) * c, 0
    );
    const avg = (sum / total).toFixed(1);
    return (
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: `${(parseFloat(avg) / 10) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
          {avg} / 10
        </span>
      </div>
    );
  }

  if (poll.type === "word_cloud") {
    const sorted = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sorted.map(([word, count]) => (
          <span
            key={word}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-300"
          >
            {word}
            <span className="font-semibold">{count}</span>
          </span>
        ))}
      </div>
    );
  }

  if (poll.type === "emoji_cloud") {
    const sorted = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {sorted.map(([emoji, count]) => (
          <span key={emoji} className="flex items-center gap-1 text-sm">
            {emoji}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{count}</span>
          </span>
        ))}
      </div>
    );
  }

  // multiple_choice, like_dislike, planning_poker — bar chart
  const options = poll.type === "multiple_choice" && Array.isArray(poll.options) && poll.options.length > 0
    ? (poll.options as string[])
    : Object.keys(valueCounts).sort((a, b) => (valueCounts[b] ?? 0) - (valueCounts[a] ?? 0));

  const max = Math.max(...options.map((o) => valueCounts[o] ?? 0), 1);

  return (
    <div className="mt-3 flex flex-col gap-2">
      {options.map((option) => {
        const count = valueCounts[option] ?? 0;
        const pct = Math.round((count / total) * 100);
        const barPct = Math.round((count / max) * 100);
        return (
          <div key={option} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-slate-600 dark:text-slate-400 truncate pr-2">{option}</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  {count} <span className="text-slate-400 dark:text-slate-500 font-normal">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PollList({
  polls,
  votesByPoll,
  votesDataByPoll,
  sessionId,
  orgSlug,
  sessionStatus,
  copyTargets,
}: {
  polls: PollRow[];
  votesByPoll: Record<string, number>;
  votesDataByPoll: Record<string, Record<string, number>>;
  sessionId: string;
  orgSlug: string;
  sessionStatus: SessionStatus;
  copyTargets: CopyTarget[];
}) {
  if (polls.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">Нет опросов</p>
        <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">Добавьте первый опрос справа</p>
      </div>
    );
  }

  const isEnded = sessionStatus === "ended";

  return (
    <div className="flex flex-col gap-2">
      {polls.map((poll) => {
        const isActive = poll.status === "active";
        const isClosed = poll.status === "closed";
        const voteCount = votesByPoll[poll.id] ?? 0;
        const valueCounts = votesDataByPoll[poll.id] ?? {};
        const showResults = isEnded || isClosed;

        return (
          <div
            key={poll.id}
            className={`rounded-xl border px-4 py-3.5 transition-colors ${
              isActive
                ? "border-green-500/40 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.05)]"
                : isClosed && !isEnded
                  ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <span className="text-xl shrink-0">{TYPE_ICON[poll.type]}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${isClosed && !isEnded ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                  {poll.title}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {TYPE_LABEL[poll.type]}
                  {voteCount > 0 && (
                    <span className="text-slate-300 dark:text-slate-600"> · {voteCount} голосов</span>
                  )}
                </p>
              </div>

              {/* Status indicator */}
              {isActive && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
                  Идёт
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {sessionStatus === "active" && (
                  <>
                    {!isActive && !isClosed && (
                      <Button
                        className="text-xs py-1.5 px-3"
                        onClick={() => activatePoll(poll.id, sessionId, orgSlug)}
                      >
                        Запустить
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        variant="secondary"
                        className="text-xs py-1.5 px-3"
                        onClick={() => closePoll(poll.id, sessionId, orgSlug)}
                      >
                        Остановить
                      </Button>
                    )}
                  </>
                )}
                {copyTargets.length > 0 && (
                  <CopyPollButton pollId={poll.id} orgSlug={orgSlug} targets={copyTargets} />
                )}
              </div>
            </div>

            {showResults && (
              <PollResults poll={poll} valueCounts={valueCounts} total={voteCount} />
            )}
          </div>
        );
      })}
    </div>
  );
}
