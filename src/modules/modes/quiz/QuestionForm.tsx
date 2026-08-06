"use client";

import { useState, useActionState } from "react";
import { createPoll } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function QuizQuestionForm({ sessionId, orgSlug }: { sessionId: string; orgSlug: string }) {
  const [title, setTitle] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correctOption, setCorrectOption] = useState("");
  const [duration, setDuration] = useState(30);
  const [explanation, setExplanation] = useState("");
  const [state, action, isPending] = useActionState(createPoll, null);

  const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);

  function handleSuccess() {
    setTitle("");
    setOptionsText("");
    setCorrectOption("");
    setDuration(30);
    setExplanation("");
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        // Reset after submit
        setTimeout(handleSuccess, 100);
        void e;
      }}
    >
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="org_slug" value={orgSlug} />
      <input type="hidden" name="type" value="multiple_choice" />
      <input type="hidden" name="quiz_mode" value="on" />
      <input type="hidden" name="correct_option" value={correctOption} />
      <input type="hidden" name="duration" value={String(duration)} />
      <input type="hidden" name="options" value={options.join("\n")} />

      {state && "error" in state && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-xs text-green-600 dark:text-green-400">Вопрос добавлен ✓</p>
      )}

      {/* Question title */}
      <div>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Вопрос</label>
        <Input
          name="title"
          placeholder="Введите текст вопроса..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Options */}
      <div>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
          Варианты ответов <span className="text-slate-400">(каждый с новой строки)</span>
        </label>
        <textarea
          name="options_text"
          rows={4}
          placeholder={"Вариант А\nВариант Б\nВариант В\nВариант Г"}
          value={optionsText}
          onChange={(e) => {
            setOptionsText(e.target.value);
            setCorrectOption("");
          }}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {/* Correct option select */}
      {options.length > 0 && (
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
            Правильный ответ
          </label>
          <div className="flex flex-col gap-1.5">
            {options.map((opt) => (
              <label key={opt} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors text-sm ${
                correctOption === opt
                  ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}>
                <input
                  type="radio"
                  name="correct_opt_select"
                  value={opt}
                  checked={correctOption === opt}
                  onChange={() => setCorrectOption(opt)}
                  className="accent-green-600 shrink-0"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Explanation (optional) */}
      <div>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
          Пояснение <span className="text-slate-400">(необязательно)</span>
        </label>
        <Input
          name="explanation"
          placeholder="Почему этот ответ правильный..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </div>

      {/* Duration */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Время ответа: <span className="font-semibold text-slate-800 dark:text-slate-200">{duration} сек</span>
        </label>
        <div className="flex items-center gap-1">
          {[15, 20, 30, 45, 60].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                duration === d
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!title.trim() || options.length < 2 || !correctOption}
        loading={isPending}
      >
        + Добавить вопрос
      </Button>
    </form>
  );
}
