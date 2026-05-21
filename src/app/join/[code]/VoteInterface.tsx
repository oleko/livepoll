"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitVote, submitQuestion, upvoteQuestion } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import type { PollType } from "@/types/database";

type PollData = {
  id: string;
  title: string;
  type: PollType;
  options: unknown[];
  status: string;
} | null;

type QuestionItem = {
  id: string;
  text: string;
  status: string;
  upvotes: number;
};

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
  initialQuestions = [],
}: {
  sessionId: string;
  joinCode: string;
  initialPoll: PollData;
  sessionStatus: string;
  initialQuestions?: QuestionItem[];
}) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [voted, setVoted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const supabase = useRef(createClient());

  // Subscribe to poll changes via broadcast
  useEffect(() => {
    const channel = supabase.current
      .channel(`session-polls:${sessionId}`)
      .on("broadcast", { event: "poll_change" }, ({ payload }) => {
        const data = payload as { type: string; poll?: PollData; poll_id?: string };
        if (data.type === "activated" && data.poll) {
          setPoll(data.poll);
          setVoted(false);
          setError(null);
          setQuestions([]);
          setUpvotedIds(new Set());
        } else if (data.type === "closed") {
          setPoll((prev) => (prev?.id === data.poll_id ? null : prev));
        }
      })
      .subscribe();

    return () => { supabase.current.removeChannel(channel); };
  }, [sessionId]);

  // Subscribe to Q&A question updates for upvoting
  useEffect(() => {
    if (poll?.type !== "qa") return;
    const channel = supabase.current
      .channel(`session-questions-voter:${sessionId}`)
      .on("broadcast", { event: "question_change" }, ({ payload }) => {
        const data = payload as { type: string; question: QuestionItem };
        if (data.type === "new" && data.question.status !== "hidden") {
          setQuestions((prev) =>
            prev.find((q) => q.id === data.question.id) ? prev : [data.question, ...prev]
          );
        } else if (data.type === "updated") {
          setQuestions((prev) =>
            data.question.status === "hidden"
              ? prev.filter((q) => q.id !== data.question.id)
              : prev.map((q) => (q.id === data.question.id ? data.question : q))
          );
        }
      })
      .subscribe();

    return () => { supabase.current.removeChannel(channel); };
  }, [poll?.type, sessionId]);

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

  async function handleUpvote(questionId: string) {
    const voterToken = getVoterToken();
    if (!voterToken || upvotedIds.has(questionId)) return;
    setUpvotedIds((prev) => new Set([...prev, questionId]));
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q))
    );
    await upvoteQuestion(questionId, voterToken, sessionId);
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
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Мероприятие ещё не началось</p>
        <p className="text-slate-500">Ожидайте начала...</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="text-center px-6">
        <div className="text-5xl mb-5">⏳</div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Ожидайте вопроса</p>
        <p className="text-slate-500 text-sm">Страница обновится автоматически</p>
      </div>
    );
  }

  if (voted) {
    const isQA = poll?.type === "qa";
    if (isQA) {
      const sortedQuestions = [...questions].sort((a, b) => b.upvotes - a.upvotes);
      return (
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📩</div>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">Вопрос отправлен!</p>
            <p className="text-slate-500 text-sm mt-1">Поддержите понравившиеся вопросы</p>
          </div>
          <div className="flex flex-col gap-2">
            {sortedQuestions.map((q) => (
              <div
                key={q.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3"
              >
                <p className="flex-1 text-sm text-slate-800 dark:text-slate-200 leading-snug">{q.text}</p>
                <button
                  onClick={() => handleUpvote(q.id)}
                  disabled={upvotedIds.has(q.id)}
                  className={`flex flex-col items-center shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                    upvotedIds.has(q.id)
                      ? "bg-indigo-600/20 text-indigo-600 dark:text-indigo-400"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-indigo-600/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  <span className="text-base leading-none">▲</span>
                  <span>{q.upvotes}</span>
                </button>
              </div>
            ))}
            {sortedQuestions.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">Пока нет других вопросов</p>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="text-center px-6">
        <div className="text-6xl mb-5">✅</div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Голос принят!</p>
        <p className="text-slate-500 text-sm">Ожидайте следующего вопроса</p>
      </div>
    );
  }

  const options = poll.options as string[];

  return (
    <div className="w-full max-w-sm">
      {/* Poll title */}
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8 leading-snug px-2">
        {poll.title}
      </h2>

      {error && (
        <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 dark:text-red-400 text-center">
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
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/10 text-slate-900 dark:text-white text-left px-5 py-4 text-base font-medium transition-colors disabled:opacity-50 active:scale-[0.98]"
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
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg"
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
              className="text-4xl aspect-square flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/10 transition-colors disabled:opacity-50 active:scale-95"
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
              className="aspect-[2/3] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-3xl font-bold text-slate-900 dark:text-white hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 transition-colors disabled:opacity-50 active:scale-95"
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
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base"
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
