"use client";

import { useState, useEffect } from "react";
import { submitFeedback } from "@/lib/actions/feedback";

type FeedbackType = "bug" | "idea" | "question";

const TYPES: { id: FeedbackType; label: string; icon: string; placeholder: string }[] = [
  {
    id: "bug",
    label: "Нашёл баг",
    icon: "🐛",
    placeholder: "Опишите что произошло и как воспроизвести...",
  },
  {
    id: "idea",
    label: "Есть идея",
    icon: "💡",
    placeholder: "Какую функцию хотели бы увидеть?",
  },
  {
    id: "question",
    label: "Вопрос",
    icon: "❓",
    placeholder: "Задайте любой вопрос...",
  },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [aboveBanner, setAboveBanner] = useState(true);

  useEffect(() => {
    setAboveBanner(!localStorage.getItem("cookie_consent"));
  }, []);
  const [type, setType] = useState<FeedbackType>("idea");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const currentType = TYPES.find((t) => t.id === type)!;

  function handleOpen() {
    setOpen((v) => !v);
    if (status === "done") {
      setStatus("idle");
      setText("");
    }
  }

  async function handleSubmit() {
    if (!text.trim() || status === "pending") return;
    setStatus("pending");
    setErrorMsg("");

    const result = await submitFeedback(type, text.trim(), window.location.href);

    if ("error" in result) {
      setErrorMsg(result.error);
      setStatus("error");
    } else {
      setStatus("done");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
        setText("");
      }, 2200);
    }
  }

  return (
    <div className={`fixed right-5 z-50 flex flex-col items-end gap-3 transition-all ${aboveBanner ? "bottom-16 sm:bottom-5" : "bottom-5"}`}>
      {/* Card */}
      {open && (
        <div className="w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/80 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Обратная связь</p>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          {status === "done" ? (
            <div className="px-4 py-10 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Спасибо!</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Мы обязательно прочитаем и учтём
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Type selector */}
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex-1 rounded-xl border py-2.5 text-center transition-colors ${
                      type === t.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <span className="block text-lg mb-0.5">{t.icon}</span>
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={currentType.placeholder}
                rows={4}
                maxLength={1000}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
              />

              {errorMsg && (
                <p className="text-xs text-red-500">{errorMsg}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!text.trim() || status === "pending"}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {status === "pending" ? "Отправляем..." : "Отправить"}
              </button>

              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                Ответим на{" "}
                <a href="mailto:oleko85@gmail.com" className="underline">oleko85@gmail.com</a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={handleOpen}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 ${
          open
            ? "bg-slate-600 hover:bg-slate-500 shadow-slate-400/30"
            : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
        }`}
        title="Обратная связь"
      >
        {open ? <span className="text-lg">✕</span> : <span className="text-xl">💬</span>}
      </button>
    </div>
  );
}
