"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { closePoll } from "@/lib/actions/polls";
import { useTheme } from "@/components/ThemeProvider";
import { SlideView } from "./SlideView";
import type { PollType } from "@/types/database";
import type { BrandingSettings } from "@/lib/actions/branding";
import type { SlideType } from "@/lib/actions/slides";

type PollSettings = {
  duration?: number;
  activated_at?: string;
  vote_limit?: number;
  allow_revote?: boolean;
  quiz_mode?: boolean;
};

type QuizReveal = { correct_option: string; explanation?: string };
type AnnouncementData = { text: string; duration: number; started_at: string };

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
};

const TEMP_LABELS = ["❄️", "🥶", "😐", "🌡️", "🔥"];
const PLANNING_POKER_VALUES = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];

function aggregateVotes(votes: { value: string }[], type: PollType, options: string[]) {
  const counts: Record<string, number> = {};
  if (type === "multiple_choice" || type === "planning_poker") {
    const keys = type === "multiple_choice" ? options : PLANNING_POKER_VALUES;
    keys.forEach((k) => (counts[k] = 0));
  }
  votes.forEach(({ value }) => {
    let vals: string[];
    try { vals = value.startsWith("[") ? (JSON.parse(value) as string[]) : [value]; }
    catch { vals = [value]; }
    vals.forEach((v) => { counts[v] = (counts[v] ?? 0) + 1; });
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .filter((e) => e.count > 0 || type === "multiple_choice");
}

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
}) {
  const accent = branding?.accent_color ?? "#6366f1";
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [quizReveal, setQuizReveal] = useState<QuizReveal | null>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [activeSlide, setActiveSlide] = useState<ActiveSlide>(initialActiveSlide ?? null);
  const [revealedSlideId, setRevealedSlideId] = useState<string | null>(null);
  const [buzzers, setBuzzers] = useState<{ token: string; ts: number }[]>([]);
  const [announcementTimeLeft, setAnnouncementTimeLeft] = useState<number | null>(null);
  const [votes, setVotes] = useState<{ value: string; ts?: string }[]>(initialVotes);
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [totalAttendees, setTotalAttendees] = useState(initialTotalAttendees);
  const [joinedCount, setJoinedCount] = useState(initialJoinedCount);
  const pulseTimestamps = useRef<number[]>([]);
  const [pulseCount, setPulseCount] = useState(0);
  const [pinnedQuestion, setPinnedQuestion] = useState<QuestionRow | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Quiz leaderboard
  const [quizScores, setQuizScores] = useState<Map<string, number>>(new Map());
  const [quizTotal, setQuizTotal] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const currentVotesRef = useRef<{ value: string; ts: string }[]>([]);
  const supabase = useRef(createClient());
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const qrBg = isDark ? "0f172a" : "ffffff";
  const qrFg = isDark ? "ffffff" : "0f172a";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=${qrBg}&color=${qrFg}&qzone=1`;
  const qrUrlLarge = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(joinUrl)}&bgcolor=${qrBg}&color=${qrFg}&qzone=2`;

  // Broadcast: poll activated / closed
  useEffect(() => {
    const sb = supabase.current;
    const channel = sb
      .channel(`session-polls:${session.id}`)
      .on("broadcast", { event: "poll_change" }, ({ payload }) => {
        const data = payload as { type: string; poll?: PollData; poll_id?: string };
        if (data.type === "activated" && data.poll) {
          setQuizReveal(null);
          setPoll(data.poll);
          setVotes([]);
        } else if (data.type === "closed") {
          const reveal = (data as { quiz_reveal?: QuizReveal }).quiz_reveal;
          if (reveal) {
            setQuizReveal(reveal);
            // Compute scores from this question's votes
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
          } else {
            setQuizReveal(null);
            setPoll((prev) => (prev?.id === data.poll_id ? null : prev));
          }
        } else if (data.type === "poll_updated" && data.poll) {
          setPoll((prev) => prev?.id === data.poll!.id ? { ...prev, ...data.poll! } : prev);
        }
      })
      .on("broadcast", { event: "voter_count" }, ({ payload }) => {
        setJoinedCount((payload as { count: number }).count);
      })
      .on("broadcast", { event: "attendees_update" }, ({ payload }) => {
        setTotalAttendees((payload as { total: number }).total);
      })
      .on("broadcast", { event: "pulse" }, () => {
        pulseTimestamps.current.push(Date.now());
        setPulseCount(pulseTimestamps.current.length);
      })
      .on("broadcast", { event: "announcement" }, ({ payload }) => {
        const data = payload as { clear?: boolean; text?: string; duration?: number; started_at?: string };
        if (data.clear) {
          setAnnouncement(null);
        } else if (data.text && data.started_at !== undefined) {
          setAnnouncement({ text: data.text, duration: data.duration ?? 0, started_at: data.started_at });
        }
      })
      .subscribe();

    const slidesChannel = sb
      .channel(`session-slides:${session.id}`)
      .on("broadcast", { event: "slide_change" }, ({ payload }) => {
        const data = payload as { type: "show" | "hide"; slide?: ActiveSlide };
        if (data.type === "show" && data.slide) {
          setActiveSlide(data.slide);
          setRevealedSlideId(null);
          setBuzzers([]);
        } else if (data.type === "hide") {
          setActiveSlide(null);
          setRevealedSlideId(null);
          setBuzzers([]);
        }
      })
      .on("broadcast", { event: "slide_reveal" }, ({ payload }) => {
        const { slide_id } = payload as { slide_id: string };
        setRevealedSlideId(slide_id);
      })
      .subscribe();

    const buzzChannel = sb
      .channel(`session-buzz:${session.id}`)
      .on("broadcast", { event: "buzz" }, ({ payload }) => {
        const { token, ts } = payload as { token: string; ts: number };
        setBuzzers((prev) => {
          if (prev.some((b) => b.token === token)) return prev;
          return [...prev, { token, ts }].sort((a, b) => a.ts - b.ts);
        });
      })
      .subscribe();

    return () => { sb.removeChannel(channel); sb.removeChannel(slidesChannel); sb.removeChannel(buzzChannel); };
  }, [session.id]);

  // Clean up expired pulse events every second
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - 10000;
      pulseTimestamps.current = pulseTimestamps.current.filter((t) => t > cutoff);
      setPulseCount(pulseTimestamps.current.length);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Announcement countdown timer
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

  // Broadcast: new / updated questions + pinned question for display
  useEffect(() => {
    const sb = supabase.current;
    const channel = sb
      .channel(`session-questions:${session.id}`)
      .on("broadcast", { event: "question_change" }, ({ payload }) => {
        const data = payload as { type: string; question?: QuestionRow; pinned?: QuestionRow | null };
        if (data.type === "new" && data.question) {
          if (data.question.status !== "hidden") {
            setQuestions((prev) => [data.question!, ...prev]);
          }
        } else if (data.type === "updated" && data.question) {
          const q = data.question;
          setQuestions((prev) =>
            q.status === "hidden"
              ? prev.filter((item) => item.id !== q.id)
              : prev.map((item) => (item.id === q.id ? q : item))
          );
          setPinnedQuestion((prev) => prev?.id === q.id ? q : prev);
        } else if (data.type === "pinned") {
          setPinnedQuestion(data.pinned ?? null);
        }
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [session.id]);

  // Broadcast: vote counts for active poll
  useEffect(() => {
    if (!poll) return;
    const sb = supabase.current;
    const channel = sb
      .channel(`poll-votes:${poll.id}`)
      .on("broadcast", { event: "vote" }, ({ payload }) => {
        const p = payload as { value: string; ts?: string };
        setVotes((prev) => [...prev, { value: p.value, ts: p.ts }]);
        if (p.ts) currentVotesRef.current.push({ value: p.value, ts: p.ts });
      })
      .on("broadcast", { event: "revote" }, ({ payload }) => {
        const { old_value, new_value } = payload as { old_value: string; new_value: string };
        setVotes((prev) => {
          let replaced = false;
          const updated = prev.map((v) => {
            if (!replaced && v.value === old_value) { replaced = true; return { value: new_value }; }
            return v;
          });
          return replaced ? updated : [...prev, { value: new_value }];
        });
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [poll?.id]);

  const chartData = useMemo(() => {
    if (!poll) return [];
    return aggregateVotes(votes, poll.type, poll.options as string[]);
  }, [votes, poll]);

  const totalVotes = votes.length;
  const visibleQuestions = useMemo(
    () => [...questions].filter((q) => q.status !== "hidden").sort((a, b) => b.upvotes - a.upvotes),
    [questions]
  );

  return (
    <main
      className={`relative h-screen overflow-hidden flex flex-col ${
        !branding?.display_bg ? "bg-white dark:bg-slate-950" : ""
      }`}
      style={branding?.display_bg ? { backgroundColor: branding.display_bg } : undefined}
    >

      {/* Slide — full screen, below announcement */}
      {activeSlide && !announcement && (
        <div className="absolute inset-0 z-20">
          <SlideView
            slide={activeSlide}
            revealed={revealedSlideId === activeSlide.id}
            buzzers={buzzers}
          />
        </div>
      )}

      {/* Announcement overlay */}
      {announcement && activeSlide?.type !== "announcement" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/92">
          <div className="text-center px-12 max-w-3xl">
            <div className="text-5xl mb-6">📢</div>
            <p className="text-5xl font-bold text-white leading-tight mb-8">{announcement.text}</p>
            {announcementTimeLeft !== null && announcementTimeLeft > 0 && (
              <p className="text-8xl font-mono font-bold text-indigo-400 tabular-nums">
                {announcementTimeLeft >= 60
                  ? `${Math.floor(announcementTimeLeft / 60)}:${String(announcementTimeLeft % 60).padStart(2, "0")}`
                  : `${announcementTimeLeft}`}
              </p>
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
              {timeLeft >= 60
                ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`
                : `${timeLeft}с`}
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
                <img
                  src={qrUrlLarge}
                  alt="QR-код для участия"
                  className="rounded-2xl block"
                  style={{
                    width:  "clamp(140px, 44vh, 420px)",
                    height: "clamp(140px, 44vh, 420px)",
                  }}
                />
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

              {(poll.type === "multiple_choice" || poll.type === "planning_poker") && chartData.length > 0 && (
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
                              <span className="text-xs font-mono text-slate-400 w-16">{ts.toUpperCase()}</span>
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
                        return (
                          <span
                            key={word}
                            style={{ fontSize: `${(1.5 + scale * 3.5).toFixed(2)}rem`, opacity: 0.55 + scale * 0.45, color: accent }}
                            className="font-bold leading-tight"
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
            <img
              src={qrUrl}
              alt="QR-код для участия"
              className="rounded-2xl opacity-80 hover:opacity-100 transition-opacity"
              width={160}
              height={160}
            />
            <p className="text-xs text-slate-400 dark:text-slate-600 text-center">Сканируйте для участия</p>
            <p className="font-mono text-slate-500 dark:text-slate-400 text-base tracking-widest">{session.join_code}</p>
          </div>
        )}
      </div>

      {!branding?.white_label && (
        <div className="absolute bottom-3 left-4 pointer-events-none">
          <span className="text-[11px] text-slate-400/50 dark:text-slate-600/60 font-medium tracking-wide select-none">
            Powered by LivePoll AI
          </span>
        </div>
      )}
    </main>
  );
}
