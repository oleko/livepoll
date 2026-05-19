"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitVote } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import type { PollType } from "@/types/database";

type PollData = {
  id: string;
  title: string;
  type: PollType;
  options: unknown[];
  status: string;
} | null;

const PLANNING_POKER_VALUES = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];
const EMOJI_OPTIONS = ["😊", "🔥", "👍", "❤️", "🎉", "😮", "🤔", "👎"];

function getVoterToken(): string {
  if (typeof window === "undefined") return "";
  let token = sessionStorage.getItem("voter_token");
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem("voter_token", token);
  }
  return token;
}

export function VoteInterface({
  sessionId,
  joinCode,
  initialPoll,
  sessionStatus,
}: {
  sessionId: string;
  joinCode: string;
  initialPoll: PollData;
  sessionStatus: string;
}) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [voted, setVoted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  // Realtime подписка на смену активного опроса
  useEffect(() => {
    const channel = supabase.current
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "polls", filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const updated = payload.new as PollData;
          if (updated?.status === "active") {
            setPoll(updated);
            setVoted(false);
            setError(null);
          } else if (payload.old && (payload.old as { id: string }).id === poll?.id) {
            setPoll(null);
          }
        }
      )
      .subscribe();

    return () => { supabase.current.removeChannel(channel); };
  }, [sessionId, poll?.id]);

  async function handleVote(value: string) {
    const voterToken = getVoterToken();
    if (!poll || !voterToken) return;

    setIsPending(true);
    setError(null);

    const fd = new FormData();
    fd.append("poll_id", poll.id);
    fd.append("voter_token", voterToken);
    fd.append("value", value);

    const result = await submitVote(fd);
    setIsPending(false);

    if (result?.error) {
      setError(result.error === "Вы уже проголосовали" ? "Вы уже проголосовали" : "Ошибка, попробуйте снова");
    } else {
      setVoted(true);
    }
  }

  if (sessionStatus === "draft") {
    return (
      <div className="text-center">
        <p className="text-xl text-slate-300">Мероприятие ещё не началось</p>
        <p className="text-slate-500 mt-2">Ожидайте начала...</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-xl text-slate-300">Ожидайте следующего вопроса</p>
        <p className="text-slate-500 mt-2 text-sm">Страница обновится автоматически</p>
      </div>
    );
  }

  if (voted) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-xl text-white">Голос принят!</p>
        <p className="text-slate-500 mt-2 text-sm">Ожидайте следующего вопроса</p>
      </div>
    );
  }

  const options = poll.options as string[];

  return (
    <div className="w-full max-w-md">
      <h2 className="text-xl font-semibold text-white text-center mb-6">{poll.title}</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {poll.type === "multiple_choice" && (
        <div className="flex flex-col gap-3">
          {options.map((opt) => (
            <Button
              key={opt}
              variant="secondary"
              className="w-full text-left justify-start py-3 text-base"
              onClick={() => handleVote(opt)}
              loading={isPending}
            >
              {opt}
            </Button>
          ))}
        </div>
      )}

      {poll.type === "temperature" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {["❄️", "🥶", "😐", "🌡️", "🔥"].map((emoji, i) => (
              <button
                key={i}
                onClick={() => handleVote(String(i + 1))}
                disabled={isPending}
                className="text-4xl hover:scale-125 transition-transform disabled:opacity-50"
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex justify-between w-full text-xs text-slate-500">
            <span>Холодно</span><span>Горячо</span>
          </div>
        </div>
      )}

      {poll.type === "like_dislike" && (
        <div className="flex justify-center gap-8">
          {[["👍", "like"], ["👎", "dislike"]].map(([emoji, val]) => (
            <button
              key={val}
              onClick={() => handleVote(val)}
              disabled={isPending}
              className="text-6xl hover:scale-125 transition-transform disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {poll.type === "word_cloud" && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            maxLength={30}
            placeholder="Введите слово или фразу..."
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVote((e.target as HTMLInputElement).value.trim());
            }}
            id="word-input"
          />
          <Button
            className="w-full"
            onClick={() => {
              const input = document.getElementById("word-input") as HTMLInputElement;
              if (input.value.trim()) handleVote(input.value.trim());
            }}
            loading={isPending}
          >
            Отправить
          </Button>
        </div>
      )}

      {poll.type === "emoji_cloud" && (
        <div className="grid grid-cols-4 gap-3">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleVote(emoji)}
              disabled={isPending}
              className="text-4xl hover:scale-125 transition-transform disabled:opacity-50 aspect-square flex items-center justify-center rounded-xl border border-slate-700 hover:border-slate-500"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {poll.type === "planning_poker" && (
        <div className="grid grid-cols-3 gap-3">
          {PLANNING_POKER_VALUES.map((val) => (
            <button
              key={val}
              onClick={() => handleVote(val)}
              disabled={isPending}
              className="aspect-[2/3] rounded-xl border border-slate-700 bg-slate-800 text-2xl font-bold text-white hover:border-indigo-500 hover:bg-indigo-600/20 transition-colors disabled:opacity-50"
            >
              {val}
            </button>
          ))}
        </div>
      )}

      {poll.type === "qa" && (
        <div className="flex flex-col gap-3">
          <textarea
            rows={3}
            maxLength={300}
            placeholder="Введите ваш вопрос..."
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            id="qa-input"
          />
          <Button
            className="w-full"
            onClick={() => {
              const input = document.getElementById("qa-input") as HTMLTextAreaElement;
              if (input.value.trim()) handleVote(input.value.trim());
            }}
            loading={isPending}
          >
            Задать вопрос
          </Button>
        </div>
      )}
    </div>
  );
}
