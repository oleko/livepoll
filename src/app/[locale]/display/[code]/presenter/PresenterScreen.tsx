"use client";

import { useState, useEffect, useRef } from "react";
import { useChannel } from "@/core/realtime/useChannel";
import { parseVoteValue } from "@/core/votes/parse";

const SLIDE_LABELS: Record<string, string> = {
  splash: "Заставка", speaker: "Спикер", schedule: "Расписание",
  quote: "Цитата", final: "Финал", spin_wheel: "Колесо", announcement: "Объявление", reveal: "Вопрос-ответ",
};
const SLIDE_ICONS: Record<string, string> = {
  splash: "🎯", speaker: "🎤", schedule: "🗓", quote: "💬",
  final: "🎉", spin_wheel: "🎡", announcement: "📢", reveal: "❓",
};
const POLL_ICONS: Record<string, string> = {
  multiple_choice: "📊", temperature: "🌡", word_cloud: "☁️",
  emoji_cloud: "😊", qa: "❓", like_dislike: "👍",
  planning_poker: "🃏", idea_wall: "💡",
};

type PollItem  = { id: string; title: string; type: string; status: string; sort_order: number; options: string[] };
type SlideItem = { id: string; type: string; content: Record<string, unknown>; sort_order: number };
type Question  = { id: string; text: string; upvotes: number };
type LineupItem =
  | { kind: "poll";  data: PollItem }
  | { kind: "slide"; data: SlideItem };

function slideTitle(s: SlideItem) {
  const c = s.content as Record<string, string>;
  return c.title || c.name || c.text?.slice(0, 50) || SLIDE_LABELS[s.type] || "Слайд";
}

function PollBar({ label, count, total, color = "#6366f1" }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-40 truncate text-slate-300 shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-slate-400 tabular-nums text-xs shrink-0">{count}</span>
      <span className="w-8 text-right text-slate-500 tabular-nums text-xs shrink-0">{pct}%</span>
    </div>
  );
}

export function PresenterScreen({
  session, polls, slides, initialActivePollId, initialActiveSlideId,
  initialVoteCounts, initialJoinedCount, questions: initialQuestions,
}: {
  session: { id: string; title: string; join_code: string; status: string };
  polls: PollItem[];
  slides: SlideItem[];
  initialActivePollId: string | null;
  initialActiveSlideId: string | null;
  initialVoteCounts: Record<string, number>;
  initialJoinedCount: number;
  questions: Question[];
}) {
  const [clock, setClock] = useState("");
  const [activePollId, setActivePollId] = useState<string | null>(initialActivePollId);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(initialActiveSlideId);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(initialVoteCounts);
  const [joinedCount, setJoinedCount] = useState(initialJoinedCount);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const currentPollRef = useRef<string | null>(initialActivePollId);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useChannel("sessionPolls", session.id, {
    poll_change: (data) => {
      if (data.type === "activated") {
        setActivePollId(data.poll.id);
        currentPollRef.current = data.poll.id;
        setVoteCounts({});
      } else if (data.type === "closed" || data.type === "display_hidden") {
        setActivePollId(null);
        currentPollRef.current = null;
        setVoteCounts({});
      }
    },
    voter_count: (payload) => {
      setJoinedCount(payload.count);
    },
  });

  useChannel("sessionSlides", session.id, {
    slide_change: (data) => {
      if (data.type === "show") setActiveSlideId(data.slide.id);
      else setActiveSlideId(null);
    },
  });

  useChannel("sessionQuestions", session.id, {
    question_change: (data) => {
      if (data.type === "new") {
        setQuestions(prev => [data.question, ...prev].slice(0, 5));
      }
    },
  });

  useChannel("pollVotes", activePollId, {
    vote: (payload) => {
      if (!payload.value) return;
      const vals = parseVoteValue(payload.value);
      setVoteCounts(prev => {
        const next = { ...prev };
        vals.forEach(v => { next[v] = (next[v] ?? 0) + 1; });
        return next;
      });
    },
  });

  const lineup: LineupItem[] = [
    ...polls.map(p => ({ kind: "poll" as const, data: p })),
    ...slides.map(s => ({ kind: "slide" as const, data: s })),
  ].sort((a, b) => a.data.sort_order - b.data.sort_order);

  const activeIdx = lineup.findIndex(item =>
    (item.kind === "poll"  && item.data.id === activePollId) ||
    (item.kind === "slide" && item.data.id === activeSlideId)
  );
  const nextItems = lineup.slice(activeIdx + 1, activeIdx + 4);

  const activePoll  = activePollId  ? polls.find(p => p.id === activePollId)   : null;
  const activeSlide = activeSlideId ? slides.find(s => s.id === activeSlideId) : null;

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  const sortedVotes = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg font-semibold text-white truncate">{session.title}</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-400 tracking-widest shrink-0">
            {session.join_code}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
            session.status === "active" ? "bg-green-500/20 text-green-400" :
            session.status === "draft"  ? "bg-slate-700 text-slate-400" :
            "bg-slate-700 text-slate-500"
          }`}>
            {session.status === "active" ? "● Идёт" : session.status === "draft" ? "Черновик" : "Завершено"}
          </span>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <span className="text-slate-400 text-sm">{joinedCount} участников</span>
          <span className="font-mono text-slate-300 text-base tabular-nums">{clock}</span>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex-1 grid lg:grid-cols-5 gap-0 overflow-hidden">

        {/* Left — current item */}
        <div className="lg:col-span-3 border-r border-slate-800 p-6 flex flex-col gap-4 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Сейчас на экране</p>

          {!activePoll && !activeSlide && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-600 text-lg">Ничего не показывается</p>
            </div>
          )}

          {activePoll && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{POLL_ICONS[activePoll.type] ?? "📊"}</span>
                <div>
                  <h2 className="text-xl font-semibold text-white">{activePoll.title}</h2>
                  <p className="text-slate-400 text-sm mt-0.5">{totalVotes} голосов</p>
                </div>
              </div>

              {activePoll.type === "multiple_choice" && sortedVotes.length > 0 && (
                <div className="flex flex-col gap-2">
                  {sortedVotes.map(([opt, count]) => (
                    <PollBar key={opt} label={opt} count={count} total={totalVotes} />
                  ))}
                </div>
              )}

              {activePoll.type === "like_dislike" && (
                <div className="flex gap-6 text-2xl font-bold">
                  <span className="text-green-400">👍 {voteCounts["like"] ?? 0}</span>
                  <span className="text-red-400">👎 {voteCounts["dislike"] ?? 0}</span>
                </div>
              )}

              {activePoll.type === "word_cloud" && sortedVotes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sortedVotes.map(([word, count]) => (
                    <span key={word} className="rounded-full bg-indigo-900/50 border border-indigo-700/40 px-3 py-1 text-sm text-indigo-300">
                      {word} <span className="font-semibold">{count}</span>
                    </span>
                  ))}
                </div>
              )}

              {activePoll.type === "temperature" && totalVotes > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-indigo-400">
                    {Math.round(Object.entries(voteCounts).reduce((sum, [k, v]) => sum + Number(k) * v, 0) / totalVotes * 10) / 10}
                  </span>
                  <span className="text-slate-400">средняя оценка</span>
                </div>
              )}

              {activePoll.type === "planning_poker" && sortedVotes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sortedVotes.map(([val, count]) => (
                    <span key={val} className="rounded-lg bg-purple-900/40 border border-purple-700/40 px-3 py-2 text-base font-bold text-purple-300">
                      {val} <span className="text-xs font-normal text-purple-400">×{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSlide && !activePoll && (
            <div className="flex items-start gap-3">
              <span className="text-2xl">{SLIDE_ICONS[activeSlide.type] ?? "📄"}</span>
              <div>
                <p className="text-xs text-purple-400 font-medium">{SLIDE_LABELS[activeSlide.type] ?? "Слайд"}</p>
                <h2 className="text-xl font-semibold text-white mt-1">{slideTitle(activeSlide)}</h2>
              </div>
            </div>
          )}
        </div>

        {/* Right — next + Q&A */}
        <div className="lg:col-span-2 p-6 flex flex-col gap-6 overflow-y-auto">

          {/* Next items */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Следующие</p>
            {nextItems.length === 0 ? (
              <p className="text-slate-600 text-sm">Ничего</p>
            ) : nextItems.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                item.kind === "poll"
                  ? "border-slate-700 bg-slate-900"
                  : "border-purple-900/50 bg-purple-950/20"
              }`}>
                <span className="text-lg shrink-0">
                  {item.kind === "poll" ? POLL_ICONS[item.data.type] ?? "📊" : SLIDE_ICONS[item.data.type] ?? "📄"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {item.kind === "poll" ? item.data.title : slideTitle(item.data)}
                  </p>
                  <p className={`text-xs mt-0.5 ${item.kind === "poll" ? "text-slate-500" : "text-purple-500"}`}>
                    {item.kind === "poll" ? item.data.type.replace("_", " ") : SLIDE_LABELS[item.data.type]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Q&A */}
          {questions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Вопросы {questions.length > 0 && `(${questions.length})`}
              </p>
              {questions.map(q => (
                <div key={q.id} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
                  <p className="text-sm text-slate-200">{q.text}</p>
                  {q.upvotes > 0 && (
                    <p className="text-xs text-slate-500 mt-1">▲ {q.upvotes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-600">
        <span>Режим ведущего — Kvoroom</span>
        <span>{lineup.length} элементов в программе</span>
      </footer>
    </div>
  );
}
