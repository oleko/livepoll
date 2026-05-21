"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitVote, submitQuestion } from "@/lib/actions/polls";
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

  async function handleSubmitQuestion(text: string) {
    const voterToken = getVoterToken();
    if (!voterToken || !text) return;

    setIsPending(true);
    setError(null);

    const fd = new FormData();
    fd.append("session_id", sessionId);
    fd.append("voter_token", voterToken);
    fd.append("text", text);

    const result = await submitQuestion(fd);
    setIsPending(false);

    if (result?.error) {
      setError("Ошибка, попробуйте снова");
    } else {
      setVoted(true);
    }
  }

  if (sessionStatus === "draft") {
    return (
      <div className="text-center px-6">
        <div className="text-5xl mb-5">🕐</div>
        <p className="text-2xl font-semibold text-white mb-2">Мероприятие ещё не началось</p>
        <p className="text-slate-500">Ожидайте начала...</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="text-center px-6">
        <div className="text-5xl mb-5">⏳</div>
        <p className="text-2xl font-semibold text-white mb-2">Ожидайте вопроса</p>
        <p className="text-slate-500 text-sm">Страница обновится автоматически</p>
      </div>
    );
  }

  if (voted) {
    const isQA = poll?.type === "qa";
    return (
      <div className="text-center px-6">
        <div className="text-6xl mb-5">{isQA ? "📩" : "✅"}</div>
        <p className="text-2xl font-semibold text-white mb-2">
          {isQA ? "Вопрос отправлен!" : "Голос принят!"}
        </p>
        <p className="text-slate-500 text-sm">
          {isQA ? "Ведущий увидит ваш вопрос" : "Ожидайте следующего вопроса"}
        </p>
      </div>
    );
  }

  const options = poll.options as string[];

  return (
    <div className="w-full max-w-sm">
      {/* Poll title */}
      <h2 className="text-2xl font-bold text-white text-center mb-8 leading-snug px-2">
        {poll.title}
      </h2>

      {error && (
        <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {poll.type === "multiple_choice" && (
        <div className="flex flex-col gap-3">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleVote(opt)}
              disabled={isPending}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 hover:border-indigo-500 hover:bg-indigo-600/10 text-white text-left px-5 py-4 text-base font-medium transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {poll.type === "temperature" && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-4 justify-center">
            {["❄️", "🥶", "😐", "🌡️", "🔥"].map((emoji, i) => (
              <button
                key={i}
                onClick={() => handleVote(String(i + 1))}
                disabled={isPending}
                className="text-5xl hover:scale-125 transition-transform disabled:opacity-50 active:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex justify-between w-full text-sm text-slate-500 px-1">
            <span>Холодно</span><span>Горячо</span>
          </div>
        </div>
      )}

      {poll.type === "like_dislike" && (
        <div className="flex justify-center gap-10">
          {[["👍", "like"], ["👎", "dislike"]].map(([emoji, val]) => (
            <button
              key={val}
              onClick={() => handleVote(val)}
              disabled={isPending}
              className="flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <span className="text-7xl hover:scale-125 transition-transform active:scale-110 inline-block">
                {emoji}
              </span>
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
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVote((e.target as HTMLInputElement).value.trim());
            }}
            id="word-input"
          />
          <Button
            className="w-full py-4 text-base"
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
              className="text-4xl aspect-square flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 hover:border-indigo-500 hover:bg-indigo-600/10 transition-colors disabled:opacity-50 active:scale-95"
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
              className="aspect-[2/3] rounded-2xl border border-slate-700 bg-slate-800 text-3xl font-bold text-white hover:border-indigo-500 hover:bg-indigo-600/20 transition-colors disabled:opacity-50 active:scale-95"
            >
              {val}
            </button>
          ))}
        </div>
      )}

      {poll.type === "qa" && (
        <div className="flex flex-col gap-3">
          <textarea
            rows={4}
            maxLength={300}
            placeholder="Введите ваш вопрос..."
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base"
            id="qa-input"
          />
          <Button
            className="w-full py-4 text-base"
            onClick={() => {
              const input = document.getElementById("qa-input") as HTMLTextAreaElement;
              if (input.value.trim()) handleSubmitQuestion(input.value.trim());
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
