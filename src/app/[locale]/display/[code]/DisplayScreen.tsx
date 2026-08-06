"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { closePoll } from "@/lib/actions/polls";
import { useTheme } from "@/components/ThemeProvider";
import { SlideView } from "./SlideView";
import type { PollType } from "@/types/database";
import type { BrandingSettings } from "@/lib/actions/branding";
import type { SlideType } from "@/lib/actions/slides";
import { useChannel } from "@/core/realtime/useChannel";
import { useSessionSync } from "@/core/realtime/useSessionSync";
import { pollModule } from "@/core/registry/polls";
import { PollDisplayHost } from "@/core/screens/PollDisplayHost";
import type { QuestionRow } from "@/core/domain/question";
import type { LeaderboardEntry } from "@/core/domain/leaderboard";
import { formatClock } from "@/core/format/time";
import { ConnectionBanner } from "@/core/screens/ConnectionBanner";
import { AnnouncementOverlay } from "@/core/screens/AnnouncementOverlay";
import { useAnnouncement } from "@/core/screens/useAnnouncement";
import { QrImage } from "@/core/screens/QrImage";
import { useQuizDisplayPhase } from "@/modules/modes/quiz/useDisplayPhase";
import { QuizDisplayOverlay } from "@/modules/modes/quiz/DisplayOverlay";
import type { PollSettings } from "@/core/settings/pollSettings";

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
  const [votes, setVotes] = useState<{ value: string; ts?: string }[]>(initialVotes);
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [totalAttendees, setTotalAttendees] = useState(initialTotalAttendees);
  const [joinedCount, setJoinedCount] = useState(initialJoinedCount);
  const pulseTimestamps = useRef<number[]>([]);
  const [pulseCount, setPulseCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Quiz leaderboard — server-computed (computeAndBroadcastLeaderboard),
  // weighted by answer speed, works the same for a lone quiz_mode poll in a
  // conference session or a full championship.
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Championship mode
  const isChampionship = championship?.enabled === true;
  const quizPhase = useQuizDisplayPhase({
    sessionId: session.id,
    enabled: isChampionship,
    auto: championship?.auto !== false,
    revealDuration: championship?.reveal_duration ?? 10,
    quizRevealed: quizReveal !== null,
    initialParticipants: initialChampParticipants,
  });
  const [pollEnded, setPollEnded] = useState(false);
  const [sortByPopularity, setSortByPopularity] = useState(false);
  const pollRef = useRef(poll);
  useEffect(() => { pollRef.current = poll; }, [poll]);
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
        setPollEnded(false);
        setSortByPopularity(false);
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
    leaderboard: (payload) => {
      setLeaderboard(payload.leaderboard);
    },
    // participant_join / quiz_start / quiz_finish are owned by
    // useQuizDisplayPhase's own subscription now (championship-only phase).
    attendees_update: (payload) => {
      setTotalAttendees(payload.total);
    },
    pulse: () => {
      pulseTimestamps.current.push(Date.now());
      setPulseCount(pulseTimestamps.current.length);
    },
    announcement: (payload) => {
      if ("clear" in payload && payload.clear) {
        setAnnouncement(null);
      } else if ("text" in payload) {
        setAnnouncement({ text: payload.text, duration: payload.duration ?? 0, started_at: payload.started_at });
      }
    },
  }, { onStatus: handleStatus });

  // Reveal and spin_wheel own their live state (reveal/buzz, countdown/winner)
  // via useDisplayLive inside SlideView's per-type module host.
  useChannel("sessionSlides", session.id, {
    slide_change: (data) => {
      if (data.type === "show") {
        setActiveSlide(data.slide);
        setSlideShowKey(k => k + 1);
      } else {
        setActiveSlide(null);
      }
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

  // Broadcast: new / updated questions (used by idea_wall's live wall).
  // "pinned" is qa's own concern — its module owns that subscription itself.
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
      }
    },
  });

  // Broadcast: vote counts for active poll
  useChannel("pollVotes", poll?.id, {
    vote: (payload) => {
      setVotes((prev) => [...prev, { value: payload.value, ts: payload.ts }]);
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

  // Poll-type module dispatch (Phase 3 core+modules) — generic once a type
  // is registered; unmigrated types keep rendering via inline branches below.
  const activePollModule = poll ? pollModule(poll.type) : undefined;
  const activePollConfig: Record<string, unknown> | null = useMemo(() => {
    if (!poll || !activePollModule) return null;
    return activePollModule.config.fromSettings({ options: poll.options, settings: poll.settings ?? {} }) as Record<string, unknown>;
  }, [poll, activePollModule]);
  const activePollAgg: Record<string, unknown> | null = useMemo(() => {
    if (!poll || !activePollModule || !activePollConfig) return null;
    return activePollModule.aggregate(votes, activePollConfig, { sortByPopularity: sortByPopularity || pollEnded }) as Record<string, unknown>;
  }, [votes, poll, activePollModule, activePollConfig, sortByPopularity, pollEnded]);

  const totalVotes = votes.length;

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
            sessionId={session.id}
            showKey={slideShowKey}
          />
        </div>
      )}

      {/* Announcement overlay */}
      {announcement && activeSlide?.type !== "announcement" && (
        <AnnouncementOverlay variant="display" text={announcement.text} timeLeft={announcementTimeLeft} />
      )}
      {isChampionship && (
        <QuizDisplayOverlay phase={quizPhase} hasActivePoll={!!poll} joinUrl={joinUrl} joinCode={session.join_code} />
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

              {activePollModule && activePollConfig && activePollAgg && (
                <PollDisplayHost
                  type={poll.type}
                  module={activePollModule}
                  config={activePollConfig}
                  agg={activePollAgg}
                  ctx={{ sessionId: session.id, pollId: poll.id, quizReveal, votes, questions }}
                  accent={accent}
                  isDark={isDark}
                />
              )}

              {quizReveal && poll.type === "multiple_choice" && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                  <div className="inline-flex flex-col items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-8 py-4">
                    <p className="text-lg font-bold text-green-500 dark:text-green-400">
                      ✓ Правильный ответ: {quizReveal.correct_option}
                    </p>
                    {quizReveal.explanation && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm italic">{quizReveal.explanation}</p>
                    )}
                  </div>

                  {showLeaderboard && leaderboard && leaderboard.length > 0 && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/90 px-6 py-4 min-w-[220px]">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">🏆 Лидерборд</p>
                      <div className="flex flex-col gap-1.5">
                        {leaderboard.slice(0, 5).map((entry, i) => (
                          <div key={entry.name} className="flex items-center gap-3">
                            <span className={`text-sm font-bold w-5 tabular-nums ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"}`}>
                              #{i + 1}
                            </span>
                            <span className="text-xs font-mono text-slate-400 w-16 truncate">{entry.name}</span>
                            <span className={`text-sm font-semibold ml-auto ${entry.correct > 0 ? "text-green-400" : "text-slate-500"}`}>
                              {entry.correct}/{entry.total}
                            </span>
                          </div>
                        ))}
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
