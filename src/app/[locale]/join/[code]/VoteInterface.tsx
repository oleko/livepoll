"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitVote } from "@/lib/actions/polls";
import { submitQuestion, upvoteQuestion } from "@/server/questions";
import type { LeaderboardEntry } from "@/lib/actions/participants";
import type { PollType } from "@/types/database";
import { useTranslations } from "next-intl";
import { useChannel } from "@/core/realtime/useChannel";
import { useSessionSync } from "@/core/realtime/useSessionSync";
import { getVoterToken } from "@/core/identity/voterToken";
import { ConnectionBanner } from "@/core/screens/ConnectionBanner";
import { AnnouncementOverlay } from "@/core/screens/AnnouncementOverlay";
import { useAnnouncement } from "@/core/screens/useAnnouncement";
import { medalFor } from "@/core/screens/medal";
import { formatClock } from "@/core/format/time";
import type { PollSettings } from "@/core/settings/pollSettings";
import { useRevealParticipantLive, RevealParticipant } from "@/modules/slides/reveal";
import type { SlideType } from "@/core/domain/slide";
import { pollModule } from "@/core/registry/polls";
import type { QuestionRow } from "@/core/domain/question";
import { QuizParticipantGate } from "@/modules/modes/quiz/ParticipantGate";

type PollData = {
  id: string;
  title: string;
  type: PollType;
  options: unknown[];
  status: string;
  settings?: PollSettings;
} | null;

type QuizReveal = { correct_option: string; explanation?: string };

type QuestionItem = QuestionRow;


export function VoteInterface({
  sessionId,
  initialPoll,
  sessionStatus,
  initialQuestions = [],
  initialActiveSlide = null,
  championshipMode = false,
  initialParticipants = [],
}: {
  sessionId: string;
  joinCode: string;
  initialPoll: PollData;
  sessionStatus: string;
  initialQuestions?: QuestionItem[];
  initialActiveSlide?: { type: string; content: Record<string, unknown> } | null;
  championshipMode?: boolean;
  initialParticipants?: { name: string }[];
}) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [voted, setVoted] = useState(() => {
    if (typeof window === "undefined" || !initialPoll) return false;
    try { return localStorage.getItem(`voted_${initialPoll.id}`) === "1"; } catch { return false; }
  });
  const [myVote, setMyVote] = useState<string | null>(null);
  const [quizReveal, setQuizReveal] = useState<QuizReveal | null>(null);
  const { announcement, timeLeft: announcementTimeLeft, setAnnouncement } = useAnnouncement(
    initialActiveSlide?.type === "announcement"
      ? {
          text: (initialActiveSlide.content as { text?: string }).text ?? "",
          duration: (initialActiveSlide.content as { duration?: number }).duration ?? 0,
          started_at: new Date().toISOString(),
        }
      : null
  );
  const [questionsSubmitted, setQuestionsSubmitted] = useState(0);
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = sessionStorage.getItem(`upvoted-${sessionId}`);
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [farewell, setFarewell] = useState<string | null>(null);
  const [pulseFlash, setPulseFlash] = useState(false);
  const [activeSlide, setActiveSlide] = useState<{ type: string; content: Record<string, unknown> } | null>(initialActiveSlide);
  const [voterCount, setVoterCount] = useState(0);
  const [registered, setRegistered] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const supabase = useRef(createClient());
  const router = useRouter();

  useEffect(() => {
    try {
      if (localStorage.getItem(`quiz_participant_${sessionId}`)) setRegistered(true);
    } catch {}
  }, [sessionId]);

  useEffect(() => {
    if (!showLeaderboard) return;
    const timer = setTimeout(() => setShowLeaderboard(false), 8000);
    return () => clearTimeout(timer);
  }, [showLeaderboard]);

  function sendPulse() {
    sendPollEvent("pulse", {});
    setPulseFlash(true);
    setTimeout(() => setPulseFlash(false), 200);
  }

  const { connected, handleStatus } = useSessionSync({
    onFirstConnect: async () => {
      const sb = supabase.current;
      const { data: activePoll } = await sb
        .from("polls")
        .select("id, title, type, options, status, settings")
        .eq("session_id", sessionId)
        .eq("status", "active")
        .maybeSingle();
      setPoll(activePoll ? (activePoll as unknown as NonNullable<PollData>) : null);

      const { data: sessionRow } = await sb
        .from("sessions")
        .select("active_slide_id")
        .eq("id", sessionId)
        .single();
      const slideId = (sessionRow as unknown as { active_slide_id?: string | null })?.active_slide_id;
      if (slideId) {
        const { data: slideData } = await sb
          .from("session_slides")
          .select("id, type, content")
          .eq("id", slideId)
          .single();
        setActiveSlide((slideData as { type: string; content: Record<string, unknown> } | null) ?? null);
      } else {
        setActiveSlide(null);
      }
    },
    onReconnect: () => router.refresh(),
  });

  const { send: sendPollEvent } = useChannel("sessionPolls", sessionId, {
    poll_change: (data) => {
      if (data.type === "activated") {
        setQuizReveal(null);
        setMyVote(null);
        setPoll(data.poll as unknown as PollData);
        setVoted(false);
        setQuestionsSubmitted(0);
        setError(null);
        setActiveSlide(null);
        setQuestions([]);
        setShowLeaderboard(false);
      } else if (data.type === "closed") {
        if (data.quiz_reveal) setQuizReveal(data.quiz_reveal);
        setPoll((prev) => (prev?.id === data.poll_id ? null : prev));
      } else if (data.type === "poll_updated") {
        setPoll((prev) => (prev?.id === data.poll.id ? { ...prev, title: data.poll.title, options: data.poll.options } : prev));
      }
    },
    leaderboard: (payload) => {
      setLeaderboard(payload.leaderboard);
      setShowLeaderboard(true);
    },
    // participant_join / quiz_start / quiz_finish are owned by
    // QuizParticipantGate's own subscription now.
    voter_count: (payload) => {
      setVoterCount(payload.count);
    },
    session_ended: (payload) => {
      setSessionEnded(true);
      setFarewell(payload.farewell ?? null);
    },
    announcement: (payload) => {
      if ("clear" in payload && payload.clear) {
        setAnnouncement(null);
      } else if ("text" in payload) {
        setAnnouncement({ text: payload.text, duration: payload.duration ?? 0, started_at: payload.started_at });
      }
    },
  }, { onStatus: handleStatus });

  useChannel("sessionSlides", sessionId, {
    slide_change: (data) => {
      if (data.type === "show") {
        setActiveSlide(data.slide);
      } else {
        setActiveSlide(null);
      }
    },
  });

  useChannel("sessionQuestions", sessionId, {
    question_change: (data) => {
      if (data.type === "new" && data.question.status !== "hidden") {
        setQuestions((prev) => [data.question, ...prev]);
      } else if (data.type === "updated") {
        const q = data.question;
        setQuestions((prev) =>
          q.status === "hidden"
            ? prev.filter((item) => item.id !== q.id)
            : prev.map((item) => (item.id === q.id ? q : item))
        );
      }
    },
  });

  const revealLive = useRevealParticipantLive({ sessionId, slide: activeSlide as { type: SlideType; content: Record<string, unknown> } | null });

  // Poll-type module dispatch (Phase 3 core+modules) — generic once a type
  // is registered; unmigrated types keep rendering via inline branches below.
  const activePollModule = poll ? pollModule(poll.type) : undefined;
  const activePollConfig: Record<string, unknown> | null = poll && activePollModule
    ? (activePollModule.config.fromSettings({ options: poll.options, settings: poll.settings ?? {} }) as Record<string, unknown>)
    : null;

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
      setError(result.error === "Вы уже проголосовали" ? t("alreadyVoted") : t("errorRetry"));
    } else {
      setVoted(true);
      try { localStorage.setItem(`voted_${poll.id}`, "1"); } catch {}
      if (poll?.type === "multiple_choice" || poll?.type === "planning_poker") setMyVote(value);
      try { (window as any).ym?.(Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID), "reachGoal", "vote_submitted"); } catch {}
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
  const t = useTranslations("VoteInterface");

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
              {isCorrect ? t("quizCorrect") : t("quizWrong")}
            </p>
            {!isCorrect && (
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">{t("quizYourAnswer", { answer: myVote })}</p>
            )}
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t("quizRevealTitle")}</p>
          </>
        )}
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 mb-3">
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">✓ {quizReveal.correct_option}</p>
        </div>
        {quizReveal.explanation && (
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed italic mt-1">{quizReveal.explanation}</p>
        )}
        {showLeaderboard && leaderboard && leaderboard.length > 0 && registered && (() => {
          const myName = typeof window !== "undefined"
            ? localStorage.getItem(`quiz_participant_${sessionId}`) ?? ""
            : "";
          const myEntry = leaderboard.find((e) => e.name === myName);
          return (
            <div className="mt-6 w-full rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-3 text-center">
                {t("quiz.leaderboard")}
              </p>
              {myEntry && (
                <div className="mb-3 rounded-xl bg-indigo-600/20 border border-indigo-500/40 px-3 py-2 text-center">
                  <p className="text-sm text-indigo-300 font-medium">
                    #{myEntry.rank} · {myEntry.score} {t("quiz.pts")} · {myEntry.correct}/{myEntry.total} {t("quiz.correct")}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-1">
                {leaderboard.slice(0, 5).map((entry, i) => {
                  const isMe = entry.name === myName;
                  const medal = medalFor(i);
                  return (
                    <div key={entry.name} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${isMe ? "bg-indigo-600/25 font-semibold" : ""}`}>
                      <span className="text-slate-900 dark:text-white">{medal} {entry.name}</span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">{entry.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-6">{t("waitNext")}</p>
      </div>
    );
  } else if (sessionEnded) {
    content = (
      <div className="text-center px-6 max-w-sm">
        <div className="text-6xl mb-5">🌟</div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">{t("sessionEnded")}</p>
        {farewell && (
          <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed italic">«{farewell}»</p>
        )}
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-5">{t("thankYou")}</p>
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
    content = <RevealParticipant content={activeSlide!.content} live={revealLive} />;
  } else if (!poll) {
    content = (
      <div className="text-center px-6">
        <div className="text-5xl mb-5">⏳</div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">{t("waiting")}</p>
        <p className="text-slate-500 text-sm">{t("waitingHint")}</p>
      </div>
    );
  } else if (poll.type === "idea_wall" && activePollModule && activePollConfig) {
    content = (
      <>
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 text-center">
            {error}
          </div>
        )}
        <activePollModule.render.participant
          config={activePollConfig}
          disabled={isPending}
          onVote={(text) => handleSubmitQuestion(text)}
          title={poll.title}
          submittedCount={questionsSubmitted}
          t={t}
        />
      </>
    );
  } else if (poll.type === "qa" && activePollModule && activePollConfig) {
    content = (
      <>
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 dark:text-red-400 text-center">
            {error}
          </div>
        )}
        <activePollModule.render.participant
          config={activePollConfig}
          disabled={isPending}
          onVote={(text) => handleSubmitQuestion(text)}
          title={poll.title}
          questions={questions}
          upvotedIds={upvotedIds}
          onUpvote={handleUpvote}
          submittedCount={questionsSubmitted}
          t={t}
        />
      </>
    );
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
            <div className="text-6xl mb-5 inline-block animate-vote-pop">✅</div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Голос принят!</p>
            <p className="text-slate-500 text-sm">Ожидайте следующего вопроса</p>
            {voterCount > 0 && (
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {voterCount} {voterCount === 1 ? "участник проголосовал" : voterCount < 5 ? "участника проголосовали" : "участников проголосовали"}
              </p>
            )}
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

        {activePollModule && activePollConfig && (
          <activePollModule.render.participant key={poll.id} config={activePollConfig} disabled={isPending} onVote={handleVote} t={t} />
        )}
      </div>
    );
  }

  return (
    <>
      {championshipMode ? (
        <QuizParticipantGate
          sessionId={sessionId}
          registered={registered}
          onRegistered={() => setRegistered(true)}
          initialParticipants={initialParticipants.map((p) => p.name)}
          leaderboard={leaderboard}
        >
          {content}
        </QuizParticipantGate>
      ) : content}
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
        <ConnectionBanner variant="compact" message="Нет соединения — пытаемся переподключиться…" />
      )}
      {pollTimeLeft !== null && pollTimeLeft > 0 && !voted && (
        <div className={`fixed top-0 inset-x-0 z-30 text-center text-sm font-semibold py-1.5 px-4 tabular-nums ${
          pollTimeLeft <= 10 ? "bg-red-500 text-white" : "bg-indigo-600 text-white"
        }`}>
          {formatClock(pollTimeLeft)}{pollTimeLeft < 60 ? " сек" : ""}
        </div>
      )}
      {announcement && (
        <AnnouncementOverlay variant="participant" text={announcement.text} timeLeft={announcementTimeLeft} />
      )}
      {showLeaderboard && leaderboard && leaderboard.length > 0 && !quizReveal && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4 pointer-events-none">
          <div className="rounded-2xl border border-indigo-500/30 bg-slate-950/95 px-4 py-4 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3 text-center">
              {t("quiz.leaderboard")}
            </p>
            <div className="flex flex-col gap-1">
              {leaderboard.slice(0, 5).map((entry, i) => {
                const myName = typeof window !== "undefined"
                  ? localStorage.getItem(`quiz_participant_${sessionId}`) ?? ""
                  : "";
                const isMe = entry.name === myName;
                const medal = medalFor(i);
                return (
                  <div key={entry.name} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${isMe ? "bg-indigo-600/25 font-semibold" : ""}`}>
                    <span className="text-white">{medal} {entry.name}</span>
                    <span className="tabular-nums text-slate-400">{entry.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
