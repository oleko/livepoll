"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { PollType } from "@/types/database";

type PollData = {
  id: string;
  title: string;
  type: PollType;
  options: unknown[];
  status: string;
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
}: {
  session: SessionData;
  initialPoll: PollData;
  initialVotes: { value: string }[];
  initialQuestions: QuestionRow[];
  joinUrl: string;
}) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [votes, setVotes] = useState(initialVotes);
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const supabase = useRef(createClient());
  const activePollId = useRef<string | null>(initialPoll?.id ?? null);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=0f172a&color=ffffff&qzone=1`;

  activePollId.current = poll?.id ?? null;

  useEffect(() => {
    const sb = supabase.current;
    const sessionCh = sb
      .channel(`display-session-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "polls", filter: `session_id=eq.${session.id}` },
        (payload) => {
          const updated = payload.new as PollData;
          if (updated?.status === "active") {
            setPoll(updated);
            setVotes([]);
          } else {
            const closedId = (payload.old as { id: string } | undefined)?.id;
            if (closedId) setPoll((prev) => (prev?.id === closedId ? null : prev));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "questions", filter: `session_id=eq.${session.id}` },
        (payload) => {
          const q = payload.new as QuestionRow;
          if (q.status !== "hidden") setQuestions((prev) => [q, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "questions", filter: `session_id=eq.${session.id}` },
        (payload) => {
          const updated = payload.new as QuestionRow;
          setQuestions((prev) =>
            updated.status === "hidden"
              ? prev.filter((q) => q.id !== updated.id)
              : prev.map((q) => (q.id === updated.id ? updated : q))
          );
        }
      )
      .subscribe();

    return () => { sb.removeChannel(sessionCh); };
  }, [session.id]);

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
    <main className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <span className="text-slate-400 text-sm font-medium">{session.title}</span>
        <div className="flex items-center gap-4">
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
            /* Waiting screen — QR code front and center */
            <div className="flex flex-col items-center gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-white mb-2">Присоединяйтесь к мероприятию</p>
                <p className="text-slate-500 text-lg">Отсканируйте QR-код или введите код на экране</p>
              </div>
              <div className="relative">
                <div className="rounded-3xl border-2 border-slate-700 bg-slate-900 p-4 shadow-2xl">
                  <img src={qrUrl} alt="QR-код для участия" className="rounded-xl block" width={220} height={220} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-slate-500 text-sm">Введите код на</p>
                <p className="text-slate-300 text-base font-medium">{joinUrl.replace(/^https?:\/\//, "")}</p>
                <div className="mt-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-8 py-4">
                  <span className="font-mono text-white text-5xl font-bold tracking-[0.2em]">
                    {session.join_code}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Active poll */
            <div className="w-full max-w-3xl">
              {/* Poll type badge */}
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

              {(poll.type === "word_cloud" || poll.type === "emoji_cloud") && (
                <div className="flex flex-wrap gap-3 justify-center max-h-80 overflow-y-auto">
                  {votes.map((v, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-indigo-600/20 border border-indigo-500/30 px-5 py-2.5 text-indigo-300 text-base"
                      style={{ fontSize: poll.type === "emoji_cloud" ? "1.75rem" : undefined }}
                    >
                      {v.value}
                    </span>
                  ))}
                  {votes.length === 0 && <p className="text-slate-500 text-xl">Ожидаем ответы...</p>}
                </div>
              )}

              {poll.type === "qa" && (
                <div className="flex flex-col gap-3 max-h-[28rem] overflow-y-auto">
                  {visibleQuestions.length === 0 ? (
                    <p className="text-slate-500 text-xl text-center">Ожидаем вопросы от аудитории...</p>
                  ) : (
                    visibleQuestions.map((q) => (
                      <div
                        key={q.id}
                        className={`rounded-xl border px-6 py-4 flex items-start gap-4 ${
                          q.status === "answered"
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-slate-700 bg-slate-800/50"
                        }`}
                      >
                        <div className="flex-1 text-white text-lg leading-snug">{q.text}</div>
                        {q.upvotes > 0 && (
                          <span className="text-indigo-400 text-sm font-semibold shrink-0">+{q.upvotes}</span>
                        )}
                        {q.status === "answered" && (
                          <span className="text-green-400 text-sm shrink-0">✓ Отвечен</span>
                        )}
                      </div>
                    ))
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
