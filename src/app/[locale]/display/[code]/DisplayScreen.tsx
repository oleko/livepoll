"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { closePoll } from "@/lib/actions/polls";
import { activateNextChampionshipPoll } from "@/lib/actions/quiz";
import type { LeaderboardEntry } from "@/lib/actions/participants";
import { useTheme } from "@/components/ThemeProvider";
import { SlideView } from "./SlideView";
import type { PollType } from "@/types/database";
import type { BrandingSettings } from "@/lib/actions/branding";
import type { SlideType } from "@/lib/actions/slides";
import { useChannel } from "@/core/realtime/useChannel";
import { useSessionSync } from "@/core/realtime/useSessionSync";
import { aggregate } from "@/core/votes/aggregate";
import { formatClock } from "@/core/format/time";
import { medalFor } from "@/core/screens/medal";
import { ConnectionBanner } from "@/core/screens/ConnectionBanner";
import { AnnouncementOverlay } from "@/core/screens/AnnouncementOverlay";
import { useAnnouncement } from "@/core/screens/useAnnouncement";
import type { PollSettings } from "@/core/settings/pollSettings";

function QrImage({ src, joinUrl, style, className }: {
  src: string; joinUrl: string;
  style?: React.CSSProperties; className?: string;
}) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center ${className ?? ""}`}
        style={style}
      >
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium px-4">Перейдите по ссылке:</p>
        <p className="text-slate-700 dark:text-slate-200 text-xs font-mono mt-1 px-2 break-all">{joinUrl.replace(/^https?:\/\//, "")}</p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="QR-код для участия"
      className={`rounded-2xl block ${className ?? ""}`}
      style={style}
      onError={() => setError(true)}
    />
  );
}

type QuizReveal = { correct_option: string; explanation?: string };

type PollData = {
  id: string;
  title: string;
  type: PollType;
  options: unknown[];
  status: string;
  settings?: PollSettings;
} | null;

type SessionData = {
  id: string;
  title: string;
  status: string;
  join_code: string;
};

type QuestionRow = {
  id: string;
  text: string;
  status: string;
  upvotes: number;
  poll_id?: string | null;
};

const TEMP_LABELS = ["❄️", "🥶", "😐", "🌡️", "🔥"];
const PLANNING_POKER_VALUES = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];

type ActiveSlide = { id: string; type: SlideType; content: Record<string, unknown> } | null;

export function DisplayScreen({
  session,
  initialPoll,
  initialVotes,
  initialQuestions,
  joinUrl,
  orgSlug,
  totalAttendees: initialTotalAttendees,
  initialJoinedCount,
  branding,
  initialActiveSlide,
  championship,
  initialChampParticipants,
}: {
  session: SessionData;
  initialPoll: PollData;
  initialVotes: { value: string }[];
  initialQuestions: QuestionRow[];
  joinUrl: string;
  orgSlug: string;
  totalAttendees: number;
  initialJoinedCount: number;
  branding?: BrandingSettings;
  initialActiveSlide?: ActiveSlide;
  championship?: { enabled?: boolean; auto?: boolean; reveal_duration?: number };
  initialChampParticipants?: string[];
}) {
  const accent = branding?.accent_color ?? "#6366f1";
  const displayFontFamily: Record<string, string> = {
    sans:  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono:  "'Courier New', Courier, monospace",
  };
  const fontFamily = displayFontFamily[branding?.display_font ?? "sans"] ?? displayFontFamily.sans;
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [quizReveal, setQuizReveal] = useState<QuizReveal | null>(null);
  const { announcement, timeLeft: announcementTimeLeft, setAnnouncement } = useAnnouncement();
  const [activeSlide, setActiveSlide] = useState<ActiveSlide>(initialActiveSlide ?? null);
  const [slideShowKey, setSlideShowKey] = useState(0);
  const [revealedSlideId, setRevealedSlideId] = useState<string | null>(null);
  const [buzzers, setBuzzers] = useState<{ token: string; ts: number }[]>([]);
  const [votes, setVotes] = useState<{ value: string; ts?: string }[]>(initialVotes);
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [totalAttendees, setTotalAttendees] = useState(initialTotalAttendees);
  const [joinedCount, setJoinedCount] = useState(initialJoinedCount);
  const pulseTimestamps = useRef<number[]>([]);
  const [pulseCount, setPulseCount] = useState(0);
  const [pinnedQuestion, setPinnedQuestion] = useState<QuestionRow | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = sessionStorage.getItem(`pinned-q-${session.id}`);
      if (!saved) return null;
      const id = JSON.parse(saved) as string;
      return initialQuestions.find((q) => q.id === id) ?? null;
    } catch { return null; }
  });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Quiz leaderboard (local, token-based for regular quiz mode)
  const [quizScores, setQuizScores] = useState<Map<string, number>>(new Map());
  const [quizTotal, setQuizTotal] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Championship mode
  const isChampionship = championship?.enabled === true;
  const champAuto = championship?.auto !== false;
  const champRevealDuration = championship?.reveal_duration ?? 10;
  const [champPhase, setChampPhase] = useState<"lobby" | "playing" | "finished">("lobby");
  const [champParticipants, setChampParticipants] = useState<string[]>(initialChampParticipants ?? []);
  const [champLeaderboard, setChampLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [champAutoCountdown, setChampAutoCountdown] = useState<number | null>(null);
  const champAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const champAutoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pokerRevealed, setPokerRevealed] = useState(false);
  const [pollEnded, setPollEnded] = useState(false);
  const [sortByPopularity, setSortByPopularity] = useState(false);
  const [spinPhase, setSpinPhase] = useState<"idle" | "countdown" | "spinning">("idle");
  const [spinCountdown, setSpinCountdown] = useState(3);
  const [spinWinner, setSpinWinner] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    if (!initialActiveSlide || initialActiveSlide.type !== "spin_wheel") return null;
    try { return sessionStorage.getItem(`spin-winner-${initialActiveSlide.id}`); } catch { return null; }
  });
  const seenWordsRef = useRef<Set<string>>(new Set());
  const pollRef = useRef(poll);
  useEffect(() => { pollRef.current = poll; }, [poll]);
  const currentVotesRef = useRef<{ value: string; ts: string }[]>([]);
  const router = useRouter();
  const supabase = useRef(createClient());
  const { connected, handleStatus } = useSessionSync({
    onFirstConnect: async () => {
      const sb = supabase.current;
      const { data: activePoll } = await sb
        .from("polls")
        .select("id, title, type, options, status, settings")
        .eq("session_id", session.id)
        .eq("status", "active")
        .maybeSingle();
      setPoll((activePoll as PollData) ?? null);

      const { data: sessionRow } = await sb
        .from("sessions")
        .select("active_slide_id")
        .eq("id", session.id)
        .single();
      const slideId = (sessionRow as unknown as { active_slide_id?: string | null })?.active_slide_id;
      if (slideId) {
        const { data: slideData } = await sb
          .from("session_slides")
          .select("id, type, content")
          .eq("id", slideId)
          .single();
        setActiveSlide((slideData as ActiveSlide) ?? null);
      } else {
        setActiveSlide(null);
      }
    },
    onReconnect: () => router.refresh(),
  });
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const qrBg = isDark ? "0f172a" : "ffffff";
  const qrFg = isDark ? "ffffff" : "0f172a";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=${qrBg}&color=${qrFg}&qzone=1`;
  const qrUrlLarge = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(joinUrl)}&bgcolor=${qrBg}&color=${qrFg}&qzone=2`;

  // Broadcast: poll activated / closed
  useChannel("sessionPolls", session.id, {
    poll_change: (data) => {
      if (data.type === "activated") {
        setQuizReveal(null);
        setPokerRevealed(false);
        setPollEnded(false);
        setSortByPopularity(false);
        seenWordsRef.current = new Set();
        setPoll(data.poll as unknown as PollData);
        setVotes([]);
        setQuestions([]);
        setActiveSlide(null);
      } else if (data.type === "display_hidden") {
        setPoll(null);
        setPollEnded(false);
      } else if (data.type === "closed") {
        const reveal = data.quiz_reveal;
        if (reveal) {
          setQuizReveal(reveal);
          const buf = currentVotesRef.current;
          if (buf.length > 0) {
            setQuizScores((prev) => {
              const next = new Map(prev);
              buf.forEach(({ ts, value }) => {
                if (value === reveal.correct_option) {
                  next.set(ts, (next.get(ts) ?? 0) + 1);
                } else if (!next.has(ts)) {
                  next.set(ts, 0);
                }
              });
              return next;
            });
            setQuizTotal((n) => n + 1);
          }
          currentVotesRef.current = [];
          setShowLeaderboard(true);
          setTimeout(() => setShowLeaderboard(false), 7000);
        } else if (data.show_result) {
          setPollEnded(true);
        } else {
          setQuizReveal(null);
          setPoll((prev) => (prev?.id === data.poll_id ? null : prev));
        }
      } else if (data.type === "poll_updated") {
        setPoll((prev) => (prev?.id === data.poll.id ? { ...prev, ...(data.poll as unknown as PollData) } : prev));
      }
    },
    voter_count: (payload) => {
      setJoinedCount(payload.count);
    },
    participant_join: (payload) => {
      setChampParticipants(payload.participants ?? []);
    },
    quiz_start: () => {
      setChampPhase("playing");
    },
    leaderboard: (payload) => {
      setChampLeaderboard(payload.leaderboard);
    },
    quiz_finish: (payload) => {
      if (payload.leaderboard) setChampLeaderboard(payload.leaderboard);
      setChampPhase("finished");
    },
    attendees_update: (payload) => {
      setTotalAttendees(payload.total);
    },
    pulse: () => {
      pulseTimestamps.current.push(Date.now());
      setPulseCount(pulseTimestamps.current.length);
    },
    poker_reveal: () => {
      setPokerRevealed(true);
    },
    announcement: (payload) => {
      if ("clear" in payload && payload.clear) {
        setAnnouncement(null);
      } else if ("text" in payload) {
        setAnnouncement({ text: payload.text, duration: payload.duration ?? 0, started_at: payload.started_at });
      }
    },
  }, { onStatus: handleStatus });

  useChannel("sessionSlides", session.id, {
    slide_change: (data) => {
      if (data.type === "show") {
        setActiveSlide(data.slide);
        setSlideShowKey(k => k + 1);
        setRevealedSlideId(null);
        setBuzzers([]);
        setSpinPhase("idle");
        setSpinCountdown(3);
        setSpinWinner(null);
      } else {
        setActiveSlide(null);
        setRevealedSlideId(null);
        setBuzzers([]);
        setSpinPhase("idle");
        setSpinCountdown(3);
        setSpinWinner(null);
      }
    },
    slide_reveal: (payload) => {
      setRevealedSlideId(payload.slide_id);
    },
    spin_start: () => {
      setSpinCountdown(3);
      setSpinPhase("countdown");
    },
  });

  useChannel("sessionBuzz", session.id, {
    buzz: (payload) => {
      setBuzzers((prev) => {
        if (prev.some((b) => b.token === payload.token)) return prev;
        return [...prev, { token: payload.token, ts: payload.ts }].sort((a, b) => a.ts - b.ts);
      });
    },
  });

  // Clean up expired pulse events every second
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - 10000;
      pulseTimestamps.current = pulseTimestamps.current.filter((t) => t > cutoff);
      setPulseCount(pulseTimestamps.current.length);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Spin wheel countdown: 3→2→1→spinning
  useEffect(() => {
    if (spinPhase !== "countdown") return;
    if (spinCountdown <= 0) {
      setSpinPhase("spinning");
      return;
    }
    const id = setTimeout(() => setSpinCountdown(n => n - 1), 1000);
    return () => clearTimeout(id);
  }, [spinPhase, spinCountdown]);

  // Countdown timer — auto-close when duration expires
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(null);

    if (!poll) return;
    const { duration, activated_at } = poll.settings ?? {};
    if (!duration || !activated_at) return;

    const endTime = new Date(activated_at).getTime() + duration * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        closePoll(poll.id, session.id, orgSlug);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [poll?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Championship auto-advance: after quiz reveal, wait reveal_duration then countdown → next poll
  useEffect(() => {
    if (!isChampionship || !champAuto || champPhase !== "playing" || !quizReveal) return;
    if (champAutoTimerRef.current) clearTimeout(champAutoTimerRef.current);
    if (champAutoIntervalRef.current) clearInterval(champAutoIntervalRef.current);
    const revealTimer = setTimeout(() => {
      let count = 3;
      setChampAutoCountdown(count);
      champAutoIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(champAutoIntervalRef.current!);
          champAutoIntervalRef.current = null;
          setChampAutoCountdown(null);
          void activateNextChampionshipPoll(session.id);
        } else {
          setChampAutoCountdown(count);
        }
      }, 1000);
    }, champRevealDuration * 1000);
    champAutoTimerRef.current = revealTimer;
    return () => {
      if (champAutoTimerRef.current) clearTimeout(champAutoTimerRef.current);
      if (champAutoIntervalRef.current) clearInterval(champAutoIntervalRef.current);
      setChampAutoCountdown(null);
    };
  }, [quizReveal, isChampionship, champAuto, champPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcast: new / updated questions + pinned question for display
  useChannel("sessionQuestions", session.id, {
    question_change: (data) => {
      if (data.type === "new") {
        const currentPoll = pollRef.current;
        const belongs = !data.question.poll_id || !currentPoll || data.question.poll_id === currentPoll.id;
        if (data.question.status !== "hidden" && belongs) {
          setQuestions((prev) => [data.question, ...prev]);
        }
      } else if (data.type === "updated") {
        const q = data.question;
        setQuestions((prev) =>
          q.status === "hidden"
            ? prev.filter((item) => item.id !== q.id)
            : prev.map((item) => (item.id === q.id ? q : item))
        );
        setPinnedQuestion((prev) => (prev?.id === q.id ? q : prev));
      } else if (data.type === "pinned") {
        const q = data.pinned;
        setPinnedQuestion(q);
        try {
          if (q) sessionStorage.setItem(`pinned-q-${session.id}`, JSON.stringify(q.id));
          else sessionStorage.removeItem(`pinned-q-${session.id}`);
        } catch {}
      }
    },
  });

  // Broadcast: vote counts for active poll
  useChannel("pollVotes", poll?.id, {
    vote: (payload) => {
      setVotes((prev) => [...prev, { value: payload.value, ts: payload.ts }]);
      if (payload.ts) currentVotesRef.current.push({ value: payload.value, ts: payload.ts });
    },
    revote: (payload) => {
      setVotes((prev) => {
        let replaced = false;
        const updated = prev.map((v) => {
          if (!replaced && v.value === payload.old_value) { replaced = true; return { value: payload.new_value }; }
          return v;
        });
        return replaced ? updated : [...prev, { value: payload.new_value }];
      });
    },
  });

  const chartData = useMemo(() => {
    if (!poll) return [];
    let buckets: { name: string; count: number }[];
    if (poll.type === "multiple_choice") {
      buckets = aggregate(votes, { seedKeys: poll.options as string[], keepZero: true }).buckets;
    } else if (poll.type === "planning_poker") {
      buckets = aggregate(votes, { seedKeys: PLANNING_POKER_VALUES }).buckets;
    } else {
      buckets = [];
    }
    return (sortByPopularity || pollEnded) ? [...buckets].sort((a, b) => b.count - a.count) : buckets;
  }, [votes, poll, sortByPopularity, pollEnded]);

  // Track seen words for fade-in animation
  useEffect(() => {
    if (poll?.type !== "word_cloud" && poll?.type !== "emoji_cloud") return;
    votes.forEach(v => seenWordsRef.current.add(v.value.toLowerCase().trim()));
  }, [votes, poll?.type]);

  function handleSpinWinner(winner: string) {
    if (activeSlide) {
      try { sessionStorage.setItem(`spin-winner-${activeSlide.id}`, winner); } catch {}
    }
    setSpinWinner(winner);
  }

  const totalVotes = votes.length;
  const visibleQuestions = useMemo(
    () => [...questions].filter((q) => q.status !== "hidden").sort((a, b) => b.upvotes - a.upvotes),
    [questions]
  );

  return (
    <main
      className={`relative h-screen overflow-hidden flex flex-col ${
        !branding?.display_bg && !branding?.display_bg_image ? "bg-white dark:bg-slate-950" : ""
      }`}
      style={{
        ...(branding?.display_bg ? { backgroundColor: branding.display_bg } : {}),
        ...(branding?.display_bg_image ? { backgroundImage: `url(${branding.display_bg_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
        fontFamily,
      }}
    >

      {!connected && (
        <ConnectionBanner variant="prominent" message="Соединение потеряно — переподключение…" />
      )}

      {/* Slide — full screen, below announcement */}
      {activeSlide && !announcement && (
        <div className="absolute inset-0 z-20">
          <SlideView
            slide={activeSlide}
            slideShowKey={slideShowKey}
            revealed={revealedSlideId === activeSlide.id}
            buzzers={buzzers}
            spinPhase={spinPhase}
            spinCountdown={spinCountdown}
            spinWinner={spinWinner}
            onSpinWinner={handleSpinWinner}
          />
        </div>
      )}

      {/* Announcement overlay */}
      {announcement && activeSlide?.type !== "announcement" && (
        <AnnouncementOverlay variant="display" text={announcement.text} timeLeft={announcementTimeLeft} />
      )}
      {/* Championship: auto-advance countdown overlay */}
      {isChampionship && champAutoCountdown !== null && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80">
          <p className="text-2xl font-semibold text-slate-300 mb-4">Следующий вопрос через</p>
          <p className="text-9xl font-bold text-white tabular-nums">{champAutoCountdown}</p>
        </div>
      )}

      {/* Championship: lobby overlay (before quiz_start) */}
      {isChampionship && champPhase === "lobby" && !poll && (
        <div className="absolute inset-0 z-[25] flex flex-col items-center justify-center bg-slate-950">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-5xl font-bold text-white mb-2">Чемпионат</h1>
          <p className="text-xl text-slate-400 mb-10">Ожидаем участников</p>
          <div className="rounded-3xl border-2 border-slate-700 bg-slate-900 p-8"
               style={{ padding: "clamp(16px, 2.5vh, 32px)" }}>
            <QrImage src={qrUrlLarge} joinUrl={joinUrl}
              style={{ width: "clamp(140px, 36vh, 360px)", height: "clamp(140px, 36vh, 360px)" }} />
          </div>
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/60 px-8 py-3">
            <span className="font-mono text-white font-bold tracking-[0.25em]"
                  style={{ fontSize: "clamp(1.5rem, 6vh, 3.5rem)" }}>
              {session.join_code}
            </span>
          </div>
          {champParticipants.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                В лобби: {champParticipants.length}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {champParticipants.map((name) => (
                  <span key={name} className="rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 px-3 py-1 text-sm font-medium">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Championship: final leaderboard + confetti */}
      {isChampionship && champPhase === "finished" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
          {/* Confetti particles */}
          {Array.from({ length: 40 }).map((_, i) => {
            const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#f97316"];
            const color = colors[i % colors.length];
            const left = (i * 2.5) % 100;
            const delay = (i * 0.15) % 3;
            const fast = i % 3 !== 0;
            return (
              <div
                key={i}
                className={fast ? "animate-[confetti-fall_3s_ease-in_infinite]" : "animate-[confetti-fall-slow_4s_ease-in_infinite]"}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: 0,
                  width: i % 2 === 0 ? 10 : 8,
                  height: i % 2 === 0 ? 10 : 16,
                  borderRadius: i % 3 === 0 ? "50%" : 2,
                  backgroundColor: color,
                  animationDelay: `${delay}s`,
                  animationDuration: fast ? `${2 + (i % 3) * 0.5}s` : `${3 + (i % 3) * 0.5}s`,
                }}
              />
            );
          })}
          <div className="relative z-10 flex flex-col items-center gap-6 animate-podium-rise">
            <div className="text-7xl">🏆</div>
            <h1 className="text-5xl font-bold text-white">Чемпионат завершён!</h1>
            {champLeaderboard && champLeaderboard.length > 0 && (
              <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-900/90 px-8 py-6 min-w-[360px]">
                <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">
                  Итоговая таблица
                </p>
                <div className="flex flex-col gap-3">
                  {champLeaderboard.slice(0, 10).map((entry, i) => {
                    const medal = medalFor(i);
                    return (
                      <div key={entry.name} className={`flex items-center gap-4 rounded-xl px-4 py-3 ${i === 0 ? "bg-yellow-500/15 border border-yellow-500/30" : "bg-slate-800/60"}`}>
                        <span className="text-xl w-8 shrink-0 text-center">{medal}</span>
                        <span className={`flex-1 font-semibold ${i === 0 ? "text-yellow-300 text-xl" : "text-white text-base"}`}>
                          {entry.name}
                        </span>
                        <span className="tabular-nums font-bold text-slate-300">{entry.score}</span>
                        <span className="text-xs text-slate-500">{entry.correct}/{entry.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timer progress bar */}
      {timeLeft !== null && poll?.settings?.duration && (
        <div className="h-1 bg-slate-200 dark:bg-slate-800 w-full shrink-0">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft / poll.settings.duration > 0.5 ? "bg-green-500" :
              timeLeft / poll.settings.duration > 0.2 ? "bg-amber-500" :
              "bg-red-500 animate-pulse"
            }`}
            style={{ width: `${Math.max(0, (timeLeft / poll.settings.duration) * 100)}%` }}
          />
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          {branding?.logo_url && (
            <img
              src={branding.logo_url}
              alt="Логотип"
              className="h-8 w-auto object-contain shrink-0 rounded"
            />
          )}
          <span className="text-slate-600 dark:text-slate-400 text-sm font-medium truncate">
            {branding?.display_header || session.title}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <span className={`text-sm font-mono font-bold tabular-nums ${timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-slate-700 dark:text-slate-300"}`}>
              {formatClock(timeLeft)}{timeLeft < 60 ? "с" : ""}
            </span>
          )}
          {pulseCount > 0 && (
            <span className="flex items-center gap-1 text-orange-500 dark:text-orange-400 font-bold tabular-nums animate-pulse">
              🔥 {pulseCount}
            </span>
          )}
          {poll && poll.type !== "qa" && totalVotes > 0 && (
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{totalVotes}</span>
          )}
          {poll && (poll.type === "multiple_choice" || poll.type === "planning_poker") && !pollEnded && totalVotes > 0 && (
            <button
              onClick={() => setSortByPopularity(v => !v)}
              title={sortByPopularity ? "Порядок вариантов" : "По популярности"}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${sortByPopularity ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400" : "border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              {sortByPopularity ? "↓ рейтинг" : "A→Z"}
            </button>
          )}
          <ThemeToggle className="opacity-40 hover:opacity-100" />
          {quizReveal ? (
            <span className="flex items-center gap-2 rounded-full bg-green-500/15 border border-green-500/30 px-3 py-1 text-sm font-semibold text-green-400">
              ✓ Ответ
            </span>
          ) : poll ? (
            <span className="flex items-center gap-2 rounded-full bg-green-500/15 border border-green-500/30 px-3 py-1 text-sm font-semibold text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 text-sm text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
              Ожидание
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          {!poll ? (
            /* Waiting screen — fully responsive, no scroll */
            <div className="flex flex-col items-center justify-center h-full w-full text-center"
                 style={{ gap: "clamp(8px, 2.5vh, 32px)", padding: "clamp(8px, 2vh, 24px)" }}>
              {branding?.logo_url && (
                <img
                  src={branding.logo_url}
                  alt="Логотип"
                  className="shrink-0 object-contain rounded"
                  style={{ maxHeight: "clamp(32px, 8vh, 72px)", maxWidth: "clamp(80px, 20vw, 240px)" }}
                />
              )}
              <p className="shrink-0 font-semibold text-slate-700 dark:text-slate-300 tracking-wide"
                 style={{ fontSize: "clamp(0.9rem, 2.5vh, 1.5rem)" }}>
                Отсканируйте, чтобы присоединиться
              </p>
              <div className="shrink-0 rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-2xl shadow-black/10 dark:shadow-black/60"
                   style={{ padding: "clamp(8px, 1.5vh, 20px)" }}>
                <QrImage src={qrUrlLarge} joinUrl={joinUrl} style={{ width: "clamp(140px, 44vh, 420px)", height: "clamp(140px, 44vh, 420px)" }} />
              </div>
              <div className="shrink-0 flex flex-col items-center"
                   style={{ gap: "clamp(4px, 1vh, 12px)" }}>
                <p className="text-slate-500 dark:text-slate-500 tracking-wide"
                   style={{ fontSize: "clamp(0.65rem, 1.4vh, 0.875rem)" }}>
                  {joinUrl.replace(/^https?:\/\//, "")}
                </p>
                <div
                  className="rounded-2xl"
                  style={{
                    padding: "clamp(8px, 1.5vh, 16px) clamp(16px, 4vh, 40px)",
                    border: `1px solid ${accent}4d`,
                    backgroundColor: `${accent}1a`,
                  }}
                >
                  <span className="font-mono text-slate-900 dark:text-white font-bold tracking-[0.25em]"
                        style={{ fontSize: "clamp(1.5rem, 7vh, 4rem)" }}>
                    {session.join_code}
                  </span>
                </div>
                {totalAttendees > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2"
                       style={{ marginTop: "clamp(4px, 1vh, 12px)" }}>
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                    <span className="text-green-600 dark:text-green-400 font-semibold tabular-nums"
                          style={{ fontSize: "clamp(0.9rem, 2.2vh, 1.25rem)" }}>
                      {joinedCount}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400"
                          style={{ fontSize: "clamp(0.75rem, 1.8vh, 1rem)" }}>
                      из {totalAttendees}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Active poll */
            <div className="w-full max-w-3xl">
              <div className="flex justify-center mb-4">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                  {poll.type === "multiple_choice" && "Множественный выбор"}
                  {poll.type === "temperature" && "Шкала температуры"}
                  {poll.type === "like_dislike" && "Лайк / Дизлайк"}
                  {poll.type === "word_cloud" && "Облако слов"}
                  {poll.type === "emoji_cloud" && "Облако эмодзи"}
                  {poll.type === "planning_poker" && "Planning Poker"}
                  {poll.type === "qa" && "Вопросы и ответы"}
                  {poll.type === "idea_wall" && "Стена идей"}
                </span>
              </div>

              <h2 className="text-4xl font-bold text-slate-900 dark:text-white text-center mb-10 leading-tight">{poll.title}</h2>

              {pollEnded && (
                <div className="flex justify-center mb-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-5 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                    Голосование окончено
                  </span>
                </div>
              )}

              {poll.type === "planning_poker" && !pokerRevealed && (
                <div className="flex flex-col items-center justify-center gap-6 py-12">
                  <p className="text-6xl">🃏</p>
                  <p className="text-2xl text-slate-500 dark:text-slate-400">{votes.length} карт выбрано</p>
                  <p className="text-base text-slate-400 dark:text-slate-500">Ведущий раскроет результаты</p>
                </div>
              )}
              {(poll.type === "multiple_choice" || (poll.type === "planning_poker" && pokerRevealed)) && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 36, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 15 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: isDark ? "#1e293b" : "#ffffff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: 8 }}
                      labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
                      itemStyle={{ color: "#818cf8" }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={
                          quizReveal
                            ? (entry.name === quizReveal.correct_option ? "#22c55e" : "#94a3b8")
                            : accent
                        } />
                      ))}
                      <LabelList
                        dataKey="count"
                        content={(props) => {
                          const { x, y, width, value } = props as { x: number; y: number; width: number; value: number };
                          if (!value) return null;
                          const pct = totalVotes > 0 ? Math.round((value / totalVotes) * 100) : 0;
                          return (
                            <text
                              x={x + width / 2}
                              y={y - 8}
                              textAnchor="middle"
                              fill={isDark ? "#e2e8f0" : "#1e293b"}
                              fontSize={14}
                              fontWeight={600}
                            >
                              {value} · {pct}%
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {quizReveal && (poll.type === "multiple_choice" || poll.type === "planning_poker") && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                  <div className="inline-flex flex-col items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-8 py-4">
                    <p className="text-lg font-bold text-green-500 dark:text-green-400">
                      ✓ Правильный ответ: {quizReveal.correct_option}
                    </p>
                    {quizReveal.explanation && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm italic">{quizReveal.explanation}</p>
                    )}
                  </div>

                  {showLeaderboard && quizScores.size > 0 && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/90 px-6 py-4 min-w-[220px]">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">🏆 Лидерборд</p>
                      <div className="flex flex-col gap-1.5">
                        {[...quizScores.entries()]
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([ts, correct], i) => (
                            <div key={ts} className="flex items-center gap-3">
                              <span className={`text-sm font-bold w-5 tabular-nums ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"}`}>
                                #{i + 1}
                              </span>
                              <span className="text-xs font-mono text-slate-400 w-16">{ts.slice(0, 6).toUpperCase()}</span>
                              <span className={`text-sm font-semibold ml-auto ${correct > 0 ? "text-green-400" : "text-slate-500"}`}>
                                {correct}/{quizTotal}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {poll.type === "temperature" && (
                <div className="flex justify-center gap-8">
                  {TEMP_LABELS.map((emoji, i) => {
                    const count = votes.filter((v) => v.value === String(i + 1)).length;
                    return (
                      <div key={i} className="text-center">
                        <div className="text-6xl mb-3">{emoji}</div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white">{count}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {poll.type === "like_dislike" && (
                <div className="flex justify-center gap-24">
                  {[["👍", "like"], ["👎", "dislike"]].map(([emoji, val]) => (
                    <div key={val} className="text-center">
                      <div className="text-8xl mb-4">{emoji}</div>
                      <div className="text-6xl font-bold text-slate-900 dark:text-white">
                        {votes.filter((v) => v.value === val).length}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {poll.type === "word_cloud" && (() => {
                const freq: Record<string, number> = {};
                votes.forEach(v => {
                  const key = v.value.toLowerCase().trim();
                  if (key) freq[key] = (freq[key] ?? 0) + 1;
                });
                if (Object.keys(freq).length === 0) {
                  return <p className="text-slate-500 text-xl text-center">Ожидаем ответы...</p>;
                }
                const vals = Object.values(freq);
                const max = Math.max(...vals);
                const min = Math.min(...vals);
                return (
                  <div className="flex flex-wrap gap-x-6 gap-y-3 justify-center items-center max-h-80 overflow-y-auto p-4">
                    {Object.entries(freq)
                      .sort((a, b) => b[1] - a[1])
                      .map(([word, count]) => {
                        const scale = max === min ? 0.5 : (count - min) / (max - min);
                        const isNew = !seenWordsRef.current.has(word);
                        return (
                          <span
                            key={word}
                            style={{ fontSize: `${(1.5 + scale * 3.5).toFixed(2)}rem`, opacity: 0.55 + scale * 0.45, color: accent }}
                            className={`font-bold leading-tight ${isNew ? "animate-fade-in" : ""}`}
                          >
                            {word}
                          </span>
                        );
                      })}
                  </div>
                );
              })()}

              {poll.type === "emoji_cloud" && (() => {
                const freq: Record<string, number> = {};
                votes.forEach(v => { if (v.value) freq[v.value] = (freq[v.value] ?? 0) + 1; });
                if (Object.keys(freq).length === 0) {
                  return <p className="text-slate-500 text-xl text-center">Ожидаем ответы...</p>;
                }
                const max = Math.max(...Object.values(freq));
                const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12);
                return (
                  <>
                    <style>{`@keyframes emojiFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-14px) rotate(4deg)}}`}</style>
                    <div className="flex flex-wrap gap-6 justify-center items-center min-h-40 py-4">
                      {sorted.map(([emoji, count], i) => {
                        const scale = max <= 1 ? 0.4 : (count - 1) / (max - 1);
                        return (
                          <span
                            key={emoji}
                            title={`${count}`}
                            style={{
                              fontSize: `${(3 + scale * 5).toFixed(2)}rem`,
                              animation: `emojiFloat ${(2.2 + (i % 5) * 0.4).toFixed(1)}s ease-in-out infinite`,
                              animationDelay: `${((i * 0.25) % 1.5).toFixed(2)}s`,
                              display: "inline-block",
                              lineHeight: 1,
                            }}
                          >
                            {emoji}
                          </span>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {poll.type === "idea_wall" && (
                visibleQuestions.length === 0 ? (
                  <p className="text-slate-500 text-xl text-center py-12">Ожидаем идеи от участников...</p>
                ) : (
                  <div className="columns-2 lg:columns-3 gap-4 max-h-[55vh] overflow-y-auto p-1">
                    {[...visibleQuestions]
                      .sort((a, b) => b.upvotes - a.upvotes)
                      .map((q, i) => {
                        const colors = [
                          "border-indigo-500/30 bg-indigo-500/10",
                          "border-purple-500/30 bg-purple-500/10",
                          "border-cyan-500/30 bg-cyan-500/10",
                          "border-emerald-500/30 bg-emerald-500/10",
                          "border-amber-500/30 bg-amber-500/10",
                        ];
                        return (
                          <div key={q.id}
                            className={`break-inside-avoid rounded-2xl border p-5 mb-4 ${colors[i % colors.length]}`}>
                            <p className="text-white text-lg leading-snug">{q.text}</p>
                            {q.upvotes > 0 && (
                              <p className="text-slate-400 text-sm mt-2">▲ {q.upvotes}</p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )
              )}

              {poll.type === "qa" && (
                <div className="flex items-center justify-center min-h-40">
                  {!pinnedQuestion ? (
                    <p className="text-slate-500 text-xl text-center">Ведущий выберет вопрос для отображения</p>
                  ) : (
                    <div className="w-full max-w-2xl">
                      <div className={`rounded-2xl border px-10 py-8 text-center ${
                        pinnedQuestion.status === "answered"
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-indigo-500/40 bg-indigo-500/5"
                      }`}>
                        <p className="text-slate-900 dark:text-white text-3xl font-medium leading-relaxed">{pinnedQuestion.text}</p>
                        <div className="flex items-center justify-center gap-4 mt-5">
                          {pinnedQuestion.upvotes > 0 && (
                            <span className="text-indigo-400 text-base">▲ {pinnedQuestion.upvotes}</span>
                          )}
                          {pinnedQuestion.status === "answered" && (
                            <span className="text-green-400 text-base">✓ Отвечен</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* QR sidebar — only shown during active poll */}
        {poll && (
          <div className="w-48 flex flex-col items-center justify-end p-6 border-l border-slate-200 dark:border-slate-800 gap-3">
            <QrImage src={qrUrl} joinUrl={joinUrl} style={{ width: 160, height: 160 }} className="opacity-80 hover:opacity-100 transition-opacity" />
            <p className="text-xs text-slate-400 dark:text-slate-600 text-center">Сканируйте для участия</p>
            <p className="font-mono text-slate-500 dark:text-slate-400 text-base tracking-widest">{session.join_code}</p>
          </div>
        )}
      </div>

      {!branding?.white_label && (
        <div className="absolute bottom-3 left-4 pointer-events-none">
          <span className="text-[11px] text-slate-400/50 dark:text-slate-600/60 font-medium tracking-wide select-none">
            Powered by Kvoroom
          </span>
        </div>
      )}
    </main>
  );
}
