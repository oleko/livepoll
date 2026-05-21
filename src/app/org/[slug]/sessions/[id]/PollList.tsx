"use client";

import { activatePoll, closePoll } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import type { Poll, SessionStatus } from "@/types/database";

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

type PollRow = Pick<Poll, "id" | "title" | "type" | "status" | "sort_order">;

export function PollList({
  polls,
  votesByPoll,
  sessionId,
  orgSlug,
  sessionStatus,
}: {
  polls: PollRow[];
  votesByPoll: Record<string, number>;
  sessionId: string;
  orgSlug: string;
  sessionStatus: SessionStatus;
}) {
  if (polls.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
        <p className="text-slate-400">Нет опросов</p>
        <p className="text-slate-600 text-sm mt-1">Добавьте первый опрос справа</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {polls.map((poll) => {
        const isActive = poll.status === "active";
        const isClosed = poll.status === "closed";
        const voteCount = votesByPoll[poll.id];

        return (
          <div
            key={poll.id}
            className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
              isActive
                ? "border-green-500/40 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.05)]"
                : isClosed
                  ? "border-slate-800 bg-slate-900 opacity-60"
                  : "border-slate-800 bg-slate-900"
            }`}
          >
            {/* Icon */}
            <span className="text-xl shrink-0">{TYPE_ICON[poll.type]}</span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm truncate ${isClosed ? "text-slate-400" : "text-white"}`}>
                {poll.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {TYPE_LABEL[poll.type]}
                {voteCount !== undefined && voteCount > 0 && (
                  <span className="text-slate-600"> · {voteCount} голосов</span>
                )}
              </p>
            </div>

            {/* Status indicator */}
            {isActive && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Идёт
              </span>
            )}

            {/* Actions */}
            {sessionStatus === "active" && (
              <div className="flex gap-2 shrink-0">
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
