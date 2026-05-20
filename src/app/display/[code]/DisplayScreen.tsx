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
  // Ref позволяет читать текущий poll.id внутри стабильного callback без пересоздания канала
  const activePollId = useRef<string | null>(initialPoll?.id ?? null);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrl)}&bgcolor=0f172a&color=ffffff&qzone=1`;

  // Синхронизируем ref при каждом рендере (без лишних эффектов)
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
      .subscribe((status) => console.log("[Realtime] polls/questions:", status));

    return () => { sb.removeChannel(sessionCh); };
  }, [session.id]);

  // Broadcast-подписка на голоса — меняется при смене опроса
  useEffect(() => {
    if (!poll) return;
    const sb = supabase.current;
    const channel = sb
      .channel(`poll-votes:${poll.id}`)
      .on("broadcast", { event: "vote" }, ({ payload }) => {
        setVotes((prev) => [...prev, { value: (payload as { value: string }).value }]);
      })
      .subscribe((status) => console.log("[Realtime] broadcast votes:", status));

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
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <span className="text-slate-400 text-sm">{session.title}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">
            Код: <span className="font-mono text-white text-lg tracking-widest">{session.join_code}</span>
          </span>
          {totalVotes > 0 && poll?.type !== "qa" && (
            <span className="text-slate-500 text-sm">{totalVotes} голосов</span>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!poll ? (
            <div className="text-center">
              <p className="text-3xl text-slate-400">Ожидание вопроса...</p>
              <p className="text-slate-600 mt-3">Следующий опрос появится автоматически</p>
            </div>
          ) : (
            <div className="w-full max-w-3xl">
              <h2 className="text-3xl font-bold text-white text-center mb-8">{poll.title}</h2>

              {(poll.type === "multiple_choice" || poll.type === "planning_poker") && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 14 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                      labelStyle={{ color: "#f1f5f9" }}
                      itemStyle={{ color: "#818cf8" }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill="#6366f1" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {poll.type === "temperature" && (
                <div className="flex justify-center gap-6">
                  {TEMP_LABELS.map((emoji, i) => {
                    const count = votes.filter((v) => v.value === String(i + 1)).length;
                    return (
                      <div key={i} className="text-center">
                        <div className="text-5xl mb-2">{emoji}</div>
                        <div className="text-2xl font-bold text-white">{count}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {poll.type === "like_dislike" && (
                <div className="flex justify-center gap-16">
                  {[["👍", "like"], ["👎", "dislike"]].map(([emoji, val]) => (
                    <div key={val} className="text-center">
                      <div className="text-6xl mb-3">{emoji}</div>
                      <div className="text-4xl font-bold text-white">
                        {votes.filter((v) => v.value === val).length}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(poll.type === "word_cloud" || poll.type === "emoji_cloud") && (
                <div className="flex flex-wrap gap-3 justify-center max-h-72 overflow-y-auto">
                  {votes.map((v, i) => (
                    <span key={i} className="rounded-full bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 text-indigo-300 text-sm">
                      {v.value}
                    </span>
                  ))}
                  {votes.length === 0 && <p className="text-slate-500 text-lg">Ожидаем ответы...</p>}
                </div>
              )}

              {poll.type === "qa" && (
                <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                  {visibleQuestions.length === 0 ? (
                    <p className="text-slate-500 text-lg text-center">Ожидаем вопросы...</p>
                  ) : (
                    visibleQuestions.map((q) => (
                      <div key={q.id} className={`rounded-xl border px-5 py-3 flex items-start gap-3 ${
                        q.status === "answered" ? "border-green-500/30 bg-green-500/5" : "border-slate-700 bg-slate-800/50"
                      }`}>
                        <div className="flex-1 text-white text-base">{q.text}</div>
                        {q.upvotes > 0 && <span className="text-slate-400 text-sm shrink-0">+{q.upvotes}</span>}
                        {q.status === "answered" && <span className="text-green-400 text-xs shrink-0">✓ Отвечен</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-48 flex flex-col items-center justify-end p-6 border-l border-slate-800 gap-3">
          <img src={qrUrl} alt="QR" className="rounded-xl" width={160} height={160} />
          <p className="text-xs text-slate-500 text-center">Отсканируйте для участия</p>
          <p className="font-mono text-white text-lg tracking-widest">{session.join_code}</p>
        </div>
      </div>
    </main>
  );
}
