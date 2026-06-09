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
  settings?: { allow_revote?: boolean; max_questions?: number; quiz_mode?: boolean; max_answers?: number; duration?: number; activated_at?: string };
} | null;

type QuizReveal = { correct_option: string; explanation?: string };
type AnnouncementData = { text: string; duration: number; started_at: string };

type QuestionItem = {
  id: string;
  text: string;
  status: string;
  upvotes: number;
};

const PLANNING_POKER_VALUES = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];
const EMOJI_OPTIONS = ["😊", "🔥", "👍", "❤️", "🎉", "😮", "🤔", "👎"];

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for HTTP (non-secure) contexts where crypto.randomUUID is unavailable
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getVoterToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem("voter_token");
  if (!token) {
    token = generateUUID();
    localStorage.setItem("voter_token", token);
  }
  return token;
}

export function VoteInterface({
  sessionId,
  initialPoll,
  sessionStatus,
  initialQuestions = [],
  initialActiveSlide = null,
}: {
  sessionId: string;
  joinCode: string;
  initialPoll: PollData;
  sessionStatus: string;
  initialQuestions?: QuestionItem[];
  initialActiveSlide?: { type: string; content: Record<string, unknown> } | null;
}) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [voted, setVoted] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [quizReveal, setQuizReveal] = useState<QuizReveal | null>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(
    initialActiveSlide?.type === "announcement"
      ? {
          text: (initialActiveSlide.content as { text?: string }).text ?? "",
          duration: (initialActiveSlide.content as { duration?: number }).duration ?? 0,
          started_at: new Date().toISOString(),
        }
      : null
  );
  const [announcementTimeLeft, setAnnouncementTimeLeft] = useState<number | null>(null);
  const [questionsSubmitted, setQuestionsSubmitted] = useState(0);
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = sessionStorage.getItem(`upvoted-${sessionId}`);
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [ideaText, setIdeaText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [farewell, setFarewell] = useState<string | null>(null);
  const [pulseFlash, setPulseFlash] = useState(false);
  const [activeSlide, setActiveSlide] = useState<{ type: string; content: Record<string, unknown> } | null>(initialActiveSlide);
  const [buzzed, setBuzzed] = useState(false);
  const [connected, setConnected] = useState(true);
  const supabase = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabase.current.channel> | null>(null);
  const buzzChannelRef = useRef<ReturnType<typeof supabase.current.channel> | null>(null);

  function sendPulse() {
    channelRef.current?.send({ type: "broadcast", event: "pulse", payload: {} });
    setPulseFlash(true);
    setTimeout(() => setPulseFlash(false), 200);
  }

  useEffect(() => {
    const channel = supabase.current
      .channel(`session-polls:${sessionId}`)
      .on("broadcast", { event: "poll_change" }, ({ payload }) => {
        const data = payload as { type: string; poll?: PollData; poll_id?: string };
        if (data.type === "activated" && data.poll) {
          setQuizReveal(null);
          setMyVote(null);
          setSelectedOptions([]);
          setPoll(data.poll);
          setVoted(false);
          setQuestionsSubmitted(0);
          setIdeaText("");
          setError(null);
          setActiveSlide(null);
          setQuestions([]);
        } else if (data.type === "closed") {
          const reveal = (data as { quiz_reveal?: QuizReveal }).quiz_reveal;
          if (reveal) setQuizReveal(reveal);
          setPoll((prev) => (prev?.id === data.poll_id ? null : prev));
        } else if (data.type === "poll_updated" && data.poll) {
          setPoll((prev) => prev?.id === data.poll!.id ? { ...prev, title: data.poll!.title, options: data.poll!.options } : prev);
        }
      })
      .on("broadcast", { event: "session_ended" }, ({ payload }) => {
        setSessionEnded(true);
        setFarewell((payload as { farewell?: string }).farewell ?? null);
      })
      .on("broadcast", { event: "announcement" }, ({ payload }) => {
        const data = payload as { clear?: boolean; text?: string; duration?: number; started_at?: string };
        if (data.clear) {
          setAnnouncement(null);
        } else if (data.text && data.started_at !== undefined) {
          setAnnouncement({ text: data.text, duration: data.duration ?? 0, started_at: data.started_at });
        }
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
    return () => { supabase.current.removeChannel(channel); channelRef.current = null; };
  }, [sessionId]);

  useEffect(() => {
    const channel = supabase.current
      .channel(`session-slides:${sessionId}`)
      .on("broadcast", { event: "slide_change" }, ({ payload }) => {
        const data = payload as { type: "show" | "hide"; slide?: { type: string; content: Record<string, unknown> } };
        if (data.type === "show" && data.slide) {
          setActiveSlide(data.slide);
          setBuzzed(false);
        } else if (data.type === "hide") {
          setActiveSlide(null);
          setBuzzed(false);
        }
      })
      .subscribe();
    return () => { supabase.current.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    const channel = supabase.current
      .channel(`session-questions:${sessionId}`)
      .on("broadcast", { event: "question_change" }, ({ payload }) => {
        const data = payload as { type: string; question?: QuestionItem };
        if (data.type === "new" && data.question && data.question.status !== "hidden") {
          setQuestions((prev) => [data.question!, ...prev]);
        } else if (data.type === "updated" && data.question) {
          const q = data.question;
          setQuestions((prev) =>
            q.status === "hidden"
              ? prev.filter((item) => item.id !== q.id)
              : prev.map((item) => (item.id === q.id ? q : item))
          );
        }
      })
      .subscribe();
    return () => { supabase.current.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    const isBuzz = activeSlide?.type === "reveal" && !!(activeSlide.content as { buzz?: boolean }).buzz;
    if (!isBuzz) {
      if (buzzChannelRef.current) {
        supabase.current.removeChannel(buzzChannelRef.current);
        buzzChannelRef.current = null;
      }
      return;
    }
    const ch = supabase.current.channel(`session-buzz:${sessionId}`).subscribe();
    buzzChannelRef.current = ch;
    return () => { supabase.current.removeChannel(ch); buzzChannelRef.current = null; };
  }, [activeSlide, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!announcement) { setAnnouncementTimeLeft(null); return; }
    if (announcement.duration <= 0) { setAnnouncementTimeLeft(null); return; }
    const update = () => {
      const elapsed = (Date.now() - new Date(announcement.started_at).getTime()) / 1000;
      const left = Math.ceil(Math.max(0, announcement.duration - elapsed));
      setAnnouncementTimeLeft(left);
      if (left <= 0) setAnnouncement(null);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [announcement]);

  const [pollTimeLeft, setPollTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    setPollTimeLeft(null);
    const { duration, activated_at } = poll?.settings ?? {};
    if (!duration || !activated_at) return;
    const endTime = new Date(activated_at).getTime() + duration * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setPollTimeLeft(left);
      if (left === 0) clearInterval(id);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [poll?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBuzzSlide = !sessionEnded &&
    activeSlide?.type === "reveal" &&
    !!(activeSlide.content as { buzz?: boolean }).buzz;

  function sendBuzz() {
    if (buzzed) return;
    const voterToken = getVoterToken();
    buzzChannelRef.current?.send({ type: "broadcast", event: "buzz", payload: { token: voterToken, ts: Date.now() } });
    setBuzzed(true);
  }

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
      if (poll?.type === "multiple_choice" || poll?.type === "planning_poker") setMyVote(value);
    }
  }

  async function handleSubmitQuestion(text: string) {
    const voterToken = getVoterToken();
    if (!voterToken || !text || !poll) return;
    setIsPending(true);
    setError(null);
    const fd = new FormData();
    fd.append("session_id", sessionId);
    fd.append("poll_id", poll.id);
    fd.append("voter_token", voterToken);
    fd.append("text", text);
    const result = await submitQuestion(fd);
    setIsPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setQuestionsSubmitted((n) => n + 1);
      setIdeaText("");
    }
  }

  async function handleUpvote(questionId: string) {
    if (upvotedIds.has(questionId)) return;
    const voterToken = getVoterToken();
    const next = new Set(upvotedIds);
    next.add(questionId);
    setUpvotedIds(next);
    try { sessionStorage.setItem(`upvoted-${sessionId}`, JSON.stringify([...next])); } catch {}
    setQuestions((prev) => prev.map((q) => q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q));
    await upvoteQuestion(questionId, voterToken, sessionId);
  }

  const showPulseButton = !sessionEnded && sessionStatus === "active";

  let content: React.ReactNode;

  if (quizReveal) {
    const didVote = myVote !== null;
    const isCorrect = didVote && myVote === quizReveal.correct_option;
    content = (
      <div className="text-center px-6 max-w-sm w-full">
        {didVote ? (
          <>
            <div className="text-6xl mb-4">{isCorrect ? "🎉" : "😔"}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {isCorrect ? "Правильно!" : "Неправильно"}
            </p>
            {!isCorrect && (
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">Ваш ответ: {myVote}</p>
            )}
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Правильный ответ</p>
          </>
        )}
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 mb-3">
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">✓ {quizReveal.correct_option}</p>
        </div>
        {quizReveal.explanation && (
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed italic mt-1">{quizReveal.explanation}</p>
        )}
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-6">Ожидайте следующего вопроса</p>
      </div>
    );
  } else if (sessionEnded) {
    content = (
      <div className="text-center px-6 max-w-sm">
        <div className="text-6xl mb-5">🌟</div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Мероприятие завершено</p>
        {farewell && (
          <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed italic">«{farewell}»</p>
        )}
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-5">Спасибо за участие!</p>
      </div>
    );
  } else if (sessionStatus === "draft") {
    content = (
      <div className="text-center px-6">
        <div className="text-5xl mb-5">🕐</div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Мероприятие ещё не началось</p>
        <p className="text-slate-500">Ожидайте начала...</p>
      </div>
    );
  } else if (isBuzzSlide) {
    const slideContent = activeSlide!.content as { question?: string };
    content = (
      <div className="text-center px-6 max-w-sm w-full flex flex-col items-center">
        {slideContent.question && (
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-snug">
            {slideContent.question}
          </h2>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">
          {buzzed ? "Ожидай подтверждения ведущего" : "Знаешь ответ? Нажми быстрее всех!"}
        </p>
        {buzzed ? (
          <div className="flex flex-col items-center gap-3">
            <span className="text-7xl animate-bounce">🔥</span>
            <p className="text-xl font-bold text-orange-500 dark:text-orange-400">Ты нажал!</p>
          </div>
        ) : (
          <button
            onClick={sendBuzz}
            className="w-44 h-44 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-transform text-white flex flex-col items-center justify-center gap-3 shadow-xl shadow-indigo-500/30"
          >
            <span className="text-5xl">⚡</span>
            <span className="text-xl font-bold">Я знаю!</span>
          </button>
        )}
      </div>
    );
  } else if (!poll) {
    content = (
      <div className="text-center px-6">
        <div className="text-5xl mb-5">⏳</div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Ожидайте вопроса</p>
        <p className="text-slate-500 text-sm">Страница обновится автоматически</p>
      </div>
    );
  } else if (poll.type === "idea_wall") {
    const submitted = questionsSubmitted > 0;
    content = (
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2 leading-snug px-2">
          {poll.title}
        </h2>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
          Поделитесь своей идеей — она появится на экране
        </p>
        {submitted ? (
          <div className="text-center">
            <div className="text-6xl mb-4">💡</div>
            <p className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Идея отправлена!</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">Ваша идея уже видна на экране</p>
            <Button
              variant="secondary"
              className="text-sm"
              onClick={() => { setQuestionsSubmitted(0); setIdeaText(""); setError(null); }}
            >
              Отправить ещё
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 text-center">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <textarea
                rows={3}
                maxLength={200}
                placeholder="Введите вашу идею..."
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base"
              />
              <Button
                className="w-full py-4 text-base"
                onClick={() => { if (ideaText.trim()) handleSubmitQuestion(ideaText.trim()); }}
                loading={isPending}
                disabled={!ideaText.trim()}
              >
                Отправить идею
              </Button>
            </div>
          </>
        )}
      </div>
    );
  } else if (poll.type === "qa") {
    const maxQ = poll.settings?.max_questions ?? 1;
    const remaining = maxQ - questionsSubmitted;

    if (remaining <= 0) {
      content = (
        <div className="text-center px-6">
          <div className="text-6xl mb-5">📩</div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            {questionsSubmitted === 1 ? "Вопрос отправлен!" : `Отправлено ${questionsSubmitted} вопроса`}
          </p>
          <p className="text-slate-500 text-sm">Ожидайте ответа ведущего</p>
        </div>
      );
    } else {
      content = (
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2 leading-snug px-2">
            {poll.title}
          </h2>
          {questionsSubmitted > 0 && (
            <p className="text-center text-sm text-green-600 dark:text-green-400 mb-4">
              ✓ Вопрос отправлен. Можно задать ещё {remaining}.
            </p>
          )}
          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 dark:text-red-400 text-center">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-3 mt-4">
            <textarea
              key={questionsSubmitted}
              rows={4}
              maxLength={300}
              placeholder="Введите ваш вопрос..."
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base"
              id="qa-input"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 dark:text-slate-500">макс. 300 символов</span>
              {maxQ > 1 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">{questionsSubmitted}/{maxQ} вопросов</span>
              )}
            </div>
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
          {questions.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Вопросы аудитории</p>
              {[...questions].sort((a, b) => b.upvotes - a.upvotes).map((q) => (
                <div key={q.id} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
                  <button
                    onClick={() => handleUpvote(q.id)}
                    disabled={upvotedIds.has(q.id)}
                    className={`flex flex-col items-center gap-0.5 shrink-0 rounded-lg px-2 py-1 text-sm font-semibold transition-colors ${
                      upvotedIds.has(q.id)
                        ? "text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                        : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                    }`}
                  >
                    <span className="text-base leading-none">▲</span>
                    <span className="text-xs">{q.upvotes}</span>
                  </button>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug pt-1">{q.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  } else if (voted) {
    const isPoker = poll?.type === "planning_poker";
    content = (
      <div className="text-center px-6">
        {isPoker && myVote ? (
          <>
            <div className="mx-auto w-20 h-28 rounded-2xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-5 shadow-lg">
              <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{myVote}</span>
            </div>
            <p className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Карта выбрана</p>
            <p className="text-slate-500 text-sm">Ведущий раскроет результаты</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-5">✅</div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Голос принят!</p>
            <p className="text-slate-500 text-sm">Ожидайте следующего вопроса</p>
          </>
        )}
        {poll?.settings?.allow_revote && (
          <button onClick={() => setVoted(false)} className="mt-5 text-sm text-indigo-500 dark:text-indigo-400 hover:underline">
            Изменить голос
          </button>
        )}
      </div>
    );
  } else {
    const options = poll.options as string[];
    content = (
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8 leading-snug px-2">
          {poll.title}
        </h2>
        {error && (
          <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {poll.type === "multiple_choice" && (() => {
          const maxAnswers = poll.settings?.max_answers ?? 1;
          if (maxAnswers === 1) {
            return (
              <div className="flex flex-col gap-3">
                {options.map((opt) => (
                  <button key={opt} onClick={() => handleVote(opt)} disabled={isPending}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/10 text-slate-900 dark:text-white text-left px-5 py-4 text-base font-medium transition-colors disabled:opacity-50 active:scale-[0.98]">
                    {opt}
                  </button>
                ))}
              </div>
            );
          }
          const toggle = (opt: string) =>
            setSelectedOptions((prev) =>
              prev.includes(opt)
                ? prev.filter((o) => o !== opt)
                : prev.length < maxAnswers
                  ? [...prev, opt]
                  : prev
            );
          return (
            <div className="flex flex-col gap-3">
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                Выберите до {maxAnswers} вариантов
                {selectedOptions.length > 0 && (
                  <span className="ml-1 font-semibold text-indigo-500 dark:text-indigo-400">
                    · выбрано {selectedOptions.length}
                  </span>
                )}
              </p>
              {options.map((opt) => {
                const isSelected = selectedOptions.includes(opt);
                const isDisabled = isPending || (!isSelected && selectedOptions.length >= maxAnswers);
                return (
                  <button key={opt} onClick={() => toggle(opt)} disabled={isDisabled}
                    className={`w-full rounded-xl border px-5 py-4 text-base font-medium text-left flex items-center justify-between transition-colors active:scale-[0.98] disabled:opacity-40 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-600/5"
                    }`}>
                    <span>{opt}</span>
                    {isSelected && <span className="text-indigo-500 dark:text-indigo-400 shrink-0 ml-2">✓</span>}
                  </button>
                );
              })}
              <Button
                className="w-full py-4 text-base mt-1"
                disabled={selectedOptions.length === 0}
                loading={isPending}
                onClick={() => handleVote(JSON.stringify(selectedOptions))}
              >
                Подтвердить ({selectedOptions.length}/{maxAnswers})
              </Button>
            </div>
          );
        })()}

        {poll.type === "temperature" && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-4 justify-center">
              {["❄️", "🥶", "😐", "🌡️", "🔥"].map((emoji, i) => (
                <button key={i} onClick={() => handleVote(String(i + 1))} disabled={isPending}
                  className="text-5xl hover:scale-110 transition-transform duration-150 disabled:opacity-50 active:scale-110">
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
              <button key={val} onClick={() => handleVote(val)} disabled={isPending}
                className="flex flex-col items-center gap-2 disabled:opacity-50">
                <span className="text-7xl hover:scale-110 transition-transform duration-150 active:scale-110 inline-block">{emoji}</span>
              </button>
            ))}
          </div>
        )}

        {poll.type === "word_cloud" && (
          <div className="flex flex-col gap-3">
            <input type="text" maxLength={30} placeholder="Введите слово или фразу..."
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg"
              onKeyDown={(e) => { if (e.key === "Enter") handleVote((e.target as HTMLInputElement).value.trim()); }}
              id="word-input" />
            <Button className="w-full py-4 text-base" loading={isPending}
              onClick={() => { const i = document.getElementById("word-input") as HTMLInputElement; if (i.value.trim()) handleVote(i.value.trim()); }}>
              Отправить
            </Button>
          </div>
        )}

        {poll.type === "emoji_cloud" && (
          <div className="grid grid-cols-4 gap-3">
            {EMOJI_OPTIONS.map((emoji) => (
              <button key={emoji} onClick={() => handleVote(emoji)} disabled={isPending}
                className="text-4xl aspect-square flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/10 transition-colors disabled:opacity-50 active:scale-95">
                {emoji}
              </button>
            ))}
          </div>
        )}

        {poll.type === "planning_poker" && (
          <div className="grid grid-cols-3 gap-3">
            {PLANNING_POKER_VALUES.map((val) => (
              <button key={val} onClick={() => handleVote(val)} disabled={isPending}
                className="aspect-[2/3] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-3xl font-bold text-slate-900 dark:text-white hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 transition-colors disabled:opacity-50 active:scale-95">
                {val}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {content}
      {showPulseButton && (
        <button
          onClick={sendPulse}
          className={`fixed bottom-14 left-1/2 -translate-x-1/2 text-5xl select-none transition-transform duration-150 ${pulseFlash ? "scale-150" : "scale-100"}`}
          title="Пульс конференции"
        >
          🔥
        </button>
      )}
      {!connected && (
        <div className="fixed top-0 inset-x-0 z-40 bg-amber-500 text-amber-950 text-center text-xs font-medium py-1.5 px-4">
          Нет соединения — пытаемся переподключиться…
        </div>
      )}
      {pollTimeLeft !== null && pollTimeLeft > 0 && !voted && (
        <div className={`fixed top-0 inset-x-0 z-30 text-center text-sm font-semibold py-1.5 px-4 tabular-nums ${
          pollTimeLeft <= 10 ? "bg-red-500 text-white" : "bg-indigo-600 text-white"
        }`}>
          {pollTimeLeft >= 60
            ? `${Math.floor(pollTimeLeft / 60)}:${String(pollTimeLeft % 60).padStart(2, "0")}`
            : `${pollTimeLeft} сек`}
        </div>
      )}
      {announcement && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 px-6">
          <div className="text-center max-w-sm w-full">
            <div className="text-5xl mb-5">📢</div>
            <p className="text-2xl font-bold text-white leading-snug mb-6">{announcement.text}</p>
            {announcementTimeLeft !== null && announcementTimeLeft > 0 && (
              <p className="text-6xl font-mono font-bold text-indigo-400 tabular-nums">
                {announcementTimeLeft >= 60
                  ? `${Math.floor(announcementTimeLeft / 60)}:${String(announcementTimeLeft % 60).padStart(2, "0")}`
                  : `${announcementTimeLeft}`}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
