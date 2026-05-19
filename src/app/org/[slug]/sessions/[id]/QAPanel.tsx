"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateQuestionStatus } from "@/lib/actions/polls";

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
  const supabase = useRef(createClient());

  useEffect(() => {
    const channel = supabase.current
      .channel(`qa-panel-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setQuestions((prev) => [payload.new as Question, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as Question;
          setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
        }
      )
      .subscribe();

    return () => { supabase.current.removeChannel(channel); };
  }, [sessionId]);

  const sorted = [...questions].sort((a, b) => b.upvotes - a.upvotes);

  async function handleStatus(q: Question, status: Question["status"]) {
    await updateQuestionStatus(q.id, status, sessionId, orgSlug);
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Q&A</h2>
        <p className="text-slate-500 text-sm text-center py-4">Вопросов пока нет</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-white mb-4">
        Q&A <span className="text-slate-500 font-normal">({questions.length})</span>
      </h2>
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {sorted.map((q) => (
          <div
            key={q.id}
            className={`rounded-lg border p-3 ${
              q.status === "answered"
                ? "border-green-500/30 bg-green-500/5"
                : q.status === "hidden"
                ? "border-slate-700 opacity-50"
                : "border-slate-700 bg-slate-800/50"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm text-white">{q.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">{STATUS_LABEL[q.status]}</span>
                  {q.upvotes > 0 && (
                    <span className="text-xs text-slate-500">+{q.upvotes}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {q.status !== "answered" && q.status !== "hidden" && (
                  <button
                    onClick={() => handleStatus(q, "answered")}
                    className="rounded px-2 py-1 text-xs text-green-400 hover:bg-green-400/10 transition-colors"
                  >
                    ✓
                  </button>
                )}
                {q.status !== "hidden" ? (
                  <button
                    onClick={() => handleStatus(q, "hidden")}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-700 transition-colors"
                  >
                    Скрыть
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatus(q, "pending")}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-700 transition-colors"
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
