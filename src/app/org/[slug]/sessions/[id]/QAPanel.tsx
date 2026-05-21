"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateQuestionStatus, pinQuestion } from "@/lib/actions/polls";
import { summarizeQuestions } from "@/lib/actions/ai";

type Question = {
  id: string;
  text: string;
  status: "pending" | "answered" | "hidden";
  upvotes: number;
  created_at: string;
};

const STATUS_LABEL = {
  pending: "Ожидает",
  answered: "Отвечен",
  hidden: "Скрыт",
};

export function QAPanel({
  sessionId,
  orgSlug,
  initialQuestions,
}: {
  sessionId: string;
  orgSlug: string;
  initialQuestions: Question[];
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const supabase = useRef(createClient());

  useEffect(() => {
    const channel = supabase.current
      .channel(`session-questions:${sessionId}`)
      .on("broadcast", { event: "question_change" }, ({ payload }) => {
        const data = payload as { type: string; question?: Question; pinned?: Question | null };
        if (data.type === "new" && data.question) {
          setQuestions((prev) => [data.question!, ...prev]);
        } else if (data.type === "updated" && data.question) {
          setQuestions((prev) =>
            prev.map((q) => (q.id === data.question!.id ? data.question! : q))
          );
        } else if (data.type === "pinned") {
          setPinnedId(data.pinned?.id ?? null);
        }
      })
      .subscribe();

    return () => { supabase.current.removeChannel(channel); };
  }, [sessionId]);

  const sorted = [...questions].sort((a, b) => b.upvotes - a.upvotes);

  async function handleStatus(q: Question, status: Question["status"]) {
    if (status === "answered" && pinnedId === q.id) {
      await pinQuestion(null, sessionId);
      setPinnedId(null);
    }
    await updateQuestionStatus(q.id, status, sessionId, orgSlug);
  }

  async function handleAiSummary() {
    const visibleTexts = questions
      .filter((q) => q.status !== "hidden")
      .map((q) => q.text);

    if (visibleTexts.length === 0) return;
    setAiLoading(true);
    setAiSummary(null);
    const result = await summarizeQuestions(visibleTexts);
    setAiLoading(false);
    setAiSummary(result.summary ?? result.error ?? "Ошибка");
  }

  async function handlePin(q: Question) {
    if (pinnedId === q.id) {
      await pinQuestion(null, sessionId);
      setPinnedId(null);
    } else {
      await pinQuestion({ id: q.id, text: q.text, status: q.status, upvotes: q.upvotes }, sessionId);
      setPinnedId(q.id);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Q&A</h2>
        <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-4">Вопросов пока нет</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Q&A <span className="text-slate-400 dark:text-slate-500 font-normal">({questions.length})</span>
        </h2>
        <button
          onClick={handleAiSummary}
          disabled={aiLoading || questions.filter(q => q.status !== "hidden").length === 0}
          className="rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 disabled:opacity-40 transition-colors"
        >
          {aiLoading ? "Анализирую..." : "✨ AI-анализ"}
        </button>
      </div>

      {aiSummary && (
        <div className="mb-4 rounded-lg bg-indigo-600/10 border border-indigo-600/20 p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
          <div className="flex justify-between items-start gap-2">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">✨ AI</span>
            <button onClick={() => setAiSummary(null)} className="text-slate-400 hover:text-slate-600 shrink-0 text-base leading-none">×</button>
          </div>
          <p className="mt-1">{aiSummary}</p>
        </div>
      )}
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {sorted.map((q) => (
          <div
            key={q.id}
            className={`rounded-lg border p-3 ${
              q.status === "answered"
                ? "border-green-500/30 bg-green-500/5"
                : q.status === "hidden"
                ? "border-slate-200 dark:border-slate-700 opacity-50"
                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm text-slate-900 dark:text-white">{q.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 dark:text-slate-500">{STATUS_LABEL[q.status]}</span>
                  {q.upvotes > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">+{q.upvotes}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {q.status !== "hidden" && (
                  <button
                    onClick={() => handlePin(q)}
                    title={pinnedId === q.id ? "Убрать с экрана" : "Показать на экране"}
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      pinnedId === q.id
                        ? "bg-indigo-600/20 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    📺
                  </button>
                )}
                {q.status !== "answered" && q.status !== "hidden" && (
                  <button
                    onClick={() => handleStatus(q, "answered")}
                    className="rounded px-2 py-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-colors"
                  >
                    ✓
                  </button>
                )}
                {q.status !== "hidden" ? (
                  <button
                    onClick={() => handleStatus(q, "hidden")}
                    className="rounded px-2 py-1 text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Скрыть
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatus(q, "pending")}
                    className="rounded px-2 py-1 text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Показать
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
