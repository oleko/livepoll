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

const STATUS_COLOR: Record<Poll["status"], string> = {
  draft:  "text-slate-500",
  active: "text-green-400",
  closed: "text-slate-600",
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
      {polls.map((poll) => (
        <div
          key={poll.id}
          className={`flex items-center justify-between rounded-xl border px-5 py-4 transition-colors ${
            poll.status === "active"
              ? "border-green-500/30 bg-green-500/5"
              : "border-slate-800 bg-slate-900"
          }`}
        >
          <div>
            <p className="font-medium text-white text-sm">{poll.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className={STATUS_COLOR[poll.status]}>
                {poll.status === "active" ? "● Активен" : poll.status === "closed" ? "Закрыт" : "Черновик"}
              </span>
              {" · "}
              {TYPE_LABEL[poll.type]}
              {votesByPoll[poll.id] ? ` · ${votesByPoll[poll.id]} голосов` : ""}
            </p>
          </div>

          {sessionStatus === "active" && (
            <div className="flex gap-2">
              {poll.status !== "active" && poll.status !== "closed" && (
                <Button
                  className="text-xs py-1 px-3"
                  onClick={() => activatePoll(poll.id, sessionId, orgSlug)}
                >
                  Запустить
                </Button>
              )}
              {poll.status === "active" && (
                <Button
                  variant="secondary"
                  className="text-xs py-1 px-3"
                  onClick={() => closePoll(poll.id, sessionId, orgSlug)}
                >
                  Остановить
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
