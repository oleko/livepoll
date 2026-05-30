"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateQuestionStatus, pinQuestion, deleteQuestion } from "@/lib/actions/polls";
import { summarizeQuestions } from "@/lib/actions/ai";

type Question = {
  id: string;
  text: string;
  status: "pending" | "answered" | "hidden";
  upvotes: number;
  created_at: string;
};

type Filter = "pending" | "all" | "answered" | "hidden";

const STATUS_LABEL: Record<Question["status"], string> = {
  pending:  "Ожидает",
  answered: "Отвечен",
  hidden:   "Скрыт",
};

function QuestionCard({
  q,
  pinnedId,
  onPin,
  onStatus,
  onDelete,
}: {
  q: Question;
  pinnedId: string | null;
  onPin: (q: Question) => void;
  onStatus: (q: Question, s: Question["status"]) => void;
  onDelete: (q: Question) => void;
}) {
  const isPinned = pinnedId === q.id;
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isPinned
          ? "border-indigo-400/60 bg-indigo-500/5 dark:bg-indigo-500/10"
          : q.status === "answered"
          ? "border-green-500/30 bg-green-500/5"
          : q.status === "hidden"
          ? "border-slate-200 dark:border-slate-800 opacity-50"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      }`}
    >
      {isPinned && (
        <p className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 mb-2 flex items-center gap-1">
          <span>📺</span> На экране
        </p>
      )}
      <p className="text-sm text-slate-900 dark:text-white leading-relaxed mb-3">{q.text}</p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs font-medium ${
          q.status === "answered" ? "text-green-600 dark:text-green-400" :
          q.status === "hidden"   ? "text-slate-400 dark:text-slate-500" :
          "text-slate-400 dark:text-slate-500"
        }`}>
          {STATUS_LABEL[q.status]}
          {q.upvotes > 0 && <span className="ml-1.5 text-slate-300 dark:text-slate-600">+{q.upvotes}</span>}
        </span>
        <div className="flex gap-1 flex-wrap">
          {q.status !== "hidden" && (
            <ActionBtn
              onClick={() => onPin(q)}
              active={isPinned}
              activeClass="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-400/30"
            >
              {isPinned ? "📺 Убрать" : "📺 На экран"}
            </ActionBtn>
          )}
          {q.status === "pending" && (
            <ActionBtn onClick={() => onStatus(q, "answered")} className="text-green-600 dark:text-green-400 hover:bg-green-500/10">
              ✓ Отвечен
            </ActionBtn>
          )}
          {q.status === "answered" && (
            <ActionBtn onClick={() => onStatus(q, "pending")} className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              ↩ Вернуть
            </ActionBtn>
          )}
          {q.status !== "hidden" ? (
            <ActionBtn onClick={() => onStatus(q, "hidden")} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Скрыть
            </ActionBtn>
          ) : (
            <ActionBtn onClick={() => onStatus(q, "pending")} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Показать
            </ActionBtn>
          )}
          <ActionBtn onClick={() => onDelete(q)} className="text-red-400 hover:bg-red-500/10">
            ✕
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  active,
  activeClass,
  className = "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  activeClass?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
        active && activeClass
          ? `border ${activeClass}`
          : `border-transparent ${className}`
      }`}
    >
      {children}
    </button>
  );
}

export function QAPanel({
  sessionId,
  orgSlug,
  initialQuestions,
}: {
  sessionId: string;
  orgSlug: string;
  initialQuestions: Question[];
}) {
  const [questions, setQuestions]   = useState<Question[]>(initialQuestions);
  const [pinnedId, setPinnedId]     = useState<string | null>(null);
  const [aiSummary, setAiSummary]   = useState<string | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [open, setOpen]             = useState(false);
  const [filter, setFilter]         = useState<Filter>("pending");
  const [search, setSearch]         = useState("");
  const [newCount, setNewCount]     = useState(0);
  const supabase = useRef(createClient());

  useEffect(() => {
    const channel = supabase.current
      .channel(`session-questions:${sessionId}`)
      .on("broadcast", { event: "question_change" }, ({ payload }) => {
        const data = payload as { type: string; question?: Question; pinned?: Question | null };
        if (data.type === "new" && data.question) {
          setQuestions((prev) => [data.question!, ...prev]);
          setNewCount((n) => n + 1);
        } else if (data.type === "updated" && data.question) {
          setQuestions((prev) =>
            prev.map((q) => (q.id === data.question!.id ? data.question! : q))
          );
        } else if (data.type === "pinned") {
          setPinnedId(data.pinned?.id ?? null);
        } else if (data.type === "deleted" && data.question) {
          setQuestions((prev) => prev.filter((q) => q.id !== data.question!.id));
        }
      })
      .subscribe();
    return () => { supabase.current.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setNewCount(0);
  }, []);

  const handlePin = useCallback(async (q: Question) => {
    if (pinnedId === q.id) {
      await pinQuestion(null, sessionId);
      setPinnedId(null);
    } else {
      await pinQuestion({ id: q.id, text: q.text, status: q.status, upvotes: q.upvotes }, sessionId);
      setPinnedId(q.id);
    }
  }, [pinnedId, sessionId]);

  const handleStatus = useCallback(async (q: Question, status: Question["status"]) => {
    if (status === "answered" && pinnedId === q.id) {
      await pinQuestion(null, sessionId);
      setPinnedId(null);
    }
    await updateQuestionStatus(q.id, status, sessionId, orgSlug);
  }, [pinnedId, sessionId, orgSlug]);

  const handleDelete = useCallback(async (q: Question) => {
    if (pinnedId === q.id) {
      await pinQuestion(null, sessionId);
      setPinnedId(null);
    }
    await deleteQuestion(q.id, sessionId, orgSlug);
    setQuestions((prev) => prev.filter((x) => x.id !== q.id));
  }, [pinnedId, sessionId, orgSlug]);

  async function handleAiSummary() {
    const texts = questions.filter((q) => q.status !== "hidden").map((q) => q.text);
    if (!texts.length) return;
    setAiLoading(true);
    setAiSummary(null);
    const result = await summarizeQuestions(texts);
    setAiLoading(false);
    setAiSummary(result.summary ?? result.error ?? "Ошибка");
  }

  const pending  = questions.filter((q) => q.status === "pending");
  const answered = questions.filter((q) => q.status === "answered");
  const hidden   = questions.filter((q) => q.status === "hidden");
  const pinnedQ  = questions.find((q) => q.id === pinnedId);

  const filtered = (() => {
    const base =
      filter === "all"      ? questions :
      filter === "pending"  ? pending   :
      filter === "answered" ? answered  : hidden;
    const q = search.trim().toLowerCase();
    const list = q ? base.filter((x) => x.text.toLowerCase().includes(q)) : base;
    return [...list].sort((a, b) => b.upvotes - a.upvotes);
  })();

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: "pending",  label: "Ожидают",  count: pending.length  },
    { key: "all",      label: "Все",      count: questions.length },
    { key: "answered", label: "Отвечены", count: answered.length  },
    { key: "hidden",   label: "Скрытые",  count: hidden.length    },
  ];

  return (
    <>
      {/* ── Sidebar card ─────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              ❓ Q&A
              <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal">
                ({questions.length})
              </span>
            </h2>
            {newCount > 0 && (
              <span className="rounded-full bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                +{newCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAiSummary}
              disabled={aiLoading || questions.filter((q) => q.status !== "hidden").length === 0}
              className="rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 disabled:opacity-40 transition-colors"
            >
              {aiLoading ? "…" : "✨ AI"}
            </button>
            <button
              type="button"
              onClick={handleOpen}
              className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Открыть →
            </button>
          </div>
        </div>

        {aiSummary && (
          <div className="mb-3 rounded-lg bg-indigo-600/10 border border-indigo-600/20 p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
            <div className="flex justify-between items-start gap-2 mb-1">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">✨ AI</span>
              <button onClick={() => setAiSummary(null)} className="text-slate-400 hover:text-slate-600 text-base leading-none">×</button>
            </div>
            {aiSummary}
          </div>
        )}

        {pinnedQ && (
          <div className="mb-3 rounded-lg border border-indigo-400/30 bg-indigo-500/5 dark:bg-indigo-500/10 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 mb-1">📺 На экране</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{pinnedQ.text}</p>
            <button
              type="button"
              onClick={() => handlePin(pinnedQ)}
              className="mt-1.5 text-[11px] text-indigo-500 dark:text-indigo-400 hover:underline"
            >
              Убрать с экрана
            </button>
          </div>
        )}

        <div className="flex gap-3 text-xs text-slate-400 dark:text-slate-500">
          {pending.length > 0  && <span className="text-amber-500 dark:text-amber-400 font-medium">{pending.length} ожидают</span>}
          {answered.length > 0 && <span>{answered.length} отвечены</span>}
          {hidden.length > 0   && <span>{hidden.length} скрыты</span>}
          {questions.length === 0 && <span>Вопросов пока нет</span>}
        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-2xl flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            style={{ maxHeight: "88vh" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Вопросы
                <span className="ml-2 text-slate-400 dark:text-slate-500 font-normal text-sm">
                  ({questions.length})
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 w-8 h-8 flex items-center justify-center transition-colors text-lg"
                title="Закрыть (Esc)"
              >
                ×
              </button>
            </div>

            {/* Search + filters + AI */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 shrink-0">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по тексту вопроса..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex gap-1 flex-wrap">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilter(tab.key)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        filter === tab.key
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`ml-1.5 ${filter === tab.key ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAiSummary}
                  disabled={aiLoading || questions.filter((q) => q.status !== "hidden").length === 0}
                  className="rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 disabled:opacity-40 transition-colors shrink-0"
                >
                  {aiLoading ? "Анализирую..." : "✨ AI-анализ"}
                </button>
              </div>
            </div>

            {/* AI summary */}
            {aiSummary && (
              <div className="mx-5 mt-4 rounded-xl bg-indigo-600/10 border border-indigo-600/20 p-4 shrink-0">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">✨ AI-анализ</span>
                  <button onClick={() => setAiSummary(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{aiSummary}</p>
              </div>
            )}

            {/* Questions list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-slate-400 dark:text-slate-500 text-sm">
                    {search ? "Вопросов не найдено" : "В этом разделе пусто"}
                  </p>
                </div>
              ) : (
                filtered.map((q) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    pinnedId={pinnedId}
                    onPin={handlePin}
                    onStatus={handleStatus}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <span>
                {pending.length > 0
                  ? <span className="text-amber-500 dark:text-amber-400 font-medium">{pending.length} ожидают ответа</span>
                  : "Все вопросы обработаны"}
              </span>
              <span>Esc — закрыть</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
