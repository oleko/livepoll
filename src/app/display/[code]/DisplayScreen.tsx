"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { closePoll } from "@/lib/actions/polls";
import type { PollType } from "@/types/database";

type PollSettings = {
  duration?: number;
  activated_at?: string;
  vote_limit?: number;
};

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
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .filter((e) => e.count > 0 || type === "multiple_choice");
}

export function DisplayScreen({
  session,
  initialPoll,
  initialVotes,
  initialQuestions,
  joinUrl,
  orgSlug,
}: {
  session: SessionData;
  initialPoll: PollData;
  initialVotes: { value: string }[];
  initialQuestions: QuestionRow[];
  joinUrl: string;
  orgSlug: string;
}) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [votes, setVotes] = useState(initialVotes);
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [pinnedQuestion, setPinnedQuestion] = useState<QuestionRow | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = useRef(createClient());
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=0f172a&color=ffffff&qzone=1`;
  const qrUrlLarge = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(joinUrl)}&bgcolor=0f172a&color=ffffff&qzone=2`;

  // Broadcast: poll activated / closed
  useEffect(() => {
    const sb = supabase.current;
    const channel = sb
      .channel(`session-polls:${session.id}`)
      .on("broadcast", { event: "poll_change" }, ({ payload }) => {
        const data = payload as { type: string; poll?: PollData; poll_id?: string };
        if (data.type === "activated" && data.poll) {
          setPoll(data.poll);
          setVotes([]);
        } else if (data.type === "closed") {
          setPoll((prev) => (prev?.id === data.poll_id ? null : prev));
        }
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [session.id]);

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
        setVotes((prev) => [...prev, { value: (payload as { value: string }).value }]);
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
    <main className="h-screen overflow-hidden bg-slate-950 flex flex-col">
      {/* Timer progress bar */}
      {timeLeft !== null && poll?.settings?.duration && (
        <div className="h-1 bg-slate-800 w-full shrink-0">
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
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <span className="text-slate-400 text-sm font-medium">{session.title}</span>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <span className={`text-sm font-mono font-bold tabular-nums ${timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-slate-300"}`}>
              {timeLeft >= 60
                ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`
                : `${timeLeft}с`}
            </span>
          )}
          {poll && poll.type !== "qa" && totalVotes > 0 && (
            <span className="text-2xl font-bold text-white tabular-nums">{totalVotes}</span>
          )}
          {poll ? (
            <span className="flex items-center gap-2 rounded-full bg-green-500/15 border border-green-500/30 px-3 py-1 text-sm font-semibold text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-sm text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-600" />
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
              <p className="shrink-0 font-semibold text-slate-300 tracking-wide"
                 style={{ fontSize: "clamp(0.9rem, 2.5vh, 1.5rem)" }}>
                Отсканируйте, чтобы присоединиться
              </p>
              <div className="shrink-0 rounded-3xl border-2 border-slate-700 bg-slate-900 shadow-2xl shadow-black/60"
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
                <p className="text-slate-500 tracking-wide"
                   style={{ fontSize: "clamp(0.65rem, 1.4vh, 0.875rem)" }}>
                  {joinUrl.replace(/^https?:\/\//, "")}
                </p>
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10"
                     style={{ padding: "clamp(8px, 1.5vh, 16px) clamp(16px, 4vh, 40px)" }}>
                  <span className="font-mono text-white font-bold tracking-[0.25em]"
                        style={{ fontSize: "clamp(1.5rem, 7vh, 4rem)" }}>
                    {session.join_code}
                  </span>
                </div>
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
                </span>
              </div>

              <h2 className="text-4xl font-bold text-white text-center mb-10 leading-tight">{poll.title}</h2>

              {(poll.type === "multiple_choice" || poll.type === "planning_poker") && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 15 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                      labelStyle={{ color: "#f1f5f9" }}
                      itemStyle={{ color: "#818cf8" }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill="#6366f1" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {poll.type === "temperature" && (
                <div className="flex justify-center gap-8">
                  {TEMP_LABELS.map((emoji, i) => {
                    const count = votes.filter((v) => v.value === String(i + 1)).length;
                    return (
                      <div key={i} className="text-center">
                        <div className="text-6xl mb-3">{emoji}</div>
                        <div className="text-4xl font-bold text-white">{count}</div>
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
                      <div className="text-6xl font-bold text-white">
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
                            style={{ fontSize: `${(1.5 + scale * 3.5).toFixed(2)}rem`, opacity: 0.55 + scale * 0.45 }}
                            className="text-indigo-300 font-bold leading-tight"
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
                        <p className="text-white text-3xl font-medium leading-relaxed">{pinnedQuestion.text}</p>
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
          <div className="w-48 flex flex-col items-center justify-end p-6 border-l border-slate-800 gap-3">
            <img
              src={qrUrl}
              alt="QR-код для участия"
              className="rounded-2xl opacity-80 hover:opacity-100 transition-opacity"
              width={160}
              height={160}
            />
            <p className="text-xs text-slate-600 text-center">Сканируйте для участия</p>
            <p className="font-mono text-slate-400 text-base tracking-widest">{session.join_code}</p>
          </div>
        )}
      </div>
    </main>
  );
}
