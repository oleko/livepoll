"use client";

import { useActionState, useState } from "react";
import { createPoll } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PollType } from "@/types/database";

type SectionItem = { id: string; title: string };

const POLL_TYPES: { value: PollType; label: string; hasOptions: boolean }[] = [
  { value: "multiple_choice", label: "Множественный выбор", hasOptions: true },
  { value: "temperature",     label: "Шкала температуры",  hasOptions: false },
  { value: "like_dislike",    label: "Лайк / Дизлайк",     hasOptions: false },
  { value: "word_cloud",      label: "Облако слов",         hasOptions: false },
  { value: "emoji_cloud",     label: "Облако эмодзи",       hasOptions: false },
  { value: "planning_poker",  label: "Planning Poker",      hasOptions: false },
  { value: "qa",              label: "Q&A",                 hasOptions: false },
];

export function NewPollForm({
  sessionId,
  orgSlug,
  sections = [],
}: {
  sessionId: string;
  orgSlug: string;
  sections?: SectionItem[];
}) {
  const [type, setType] = useState<PollType>("multiple_choice");
  const [optionsText, setOptionsText] = useState("");
  const [quizMode, setQuizMode] = useState(false);
  const [state, action, isPending] = useActionState(createPoll, null);

  const parsedOptions = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);

  const selectedType = POLL_TYPES.find((t) => t.value === type)!;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="org_slug" value={orgSlug} />

      {sections.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Секция</label>
          <select
            name="section_id"
            defaultValue=""
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— без секции —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      )}

      {state && "error" in state && (
        <p className="text-xs text-red-500 dark:text-red-400">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-xs text-green-600 dark:text-green-400">Опрос добавлен</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Тип опроса</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as PollType)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {POLL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <Input
        label="Вопрос"
        name="title"
        placeholder="Введите вопрос..."
        required
      />

      {selectedType.hasOptions && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Варианты ответов
            <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">(каждый с новой строки)</span>
          </label>
          <textarea
            name="options"
            rows={4}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={"Вариант А\nВариант Б\nВариант В"}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Таймер</label>
        <select
          name="duration"
          defaultValue="0"
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="0">Без таймера</option>
          <option value="30">30 секунд</option>
          <option value="60">1 минута</option>
          <option value="120">2 минуты</option>
          <option value="180">3 минуты</option>
          <option value="300">5 минут</option>
          <option value="600">10 минут</option>
        </select>
      </div>

      {type === "multiple_choice" && (
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Вариантов выбора
          </label>
          <div className="flex items-center gap-2">
            <select
              name="max_answers"
              defaultValue="1"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1,2,3,4,5].map(n => (
                <option key={n} value={n}>{n === 1 ? "1 (одиночный)" : `до ${n}`}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">макс.</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
          Лимит голосов
        </label>
        <div className="flex items-center gap-2">
          <input
            name="vote_limit"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue="0"
            className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">0 = без лимита</span>
        </div>
      </div>

      {type !== "qa" && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            name="allow_revote"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-indigo-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Разрешить переголосовать</span>
        </label>
      )}

      {type === "multiple_choice" && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="quiz_mode"
            checked={quizMode}
            onChange={(e) => setQuizMode(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-indigo-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">🎯 Квиз-режим (правильный ответ)</span>
        </label>
      )}

      {quizMode && type === "multiple_choice" && (
        <div className="flex flex-col gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Правильный ответ</label>
            <select
              name="correct_option"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— выберите из вариантов выше —</option>
              {parsedOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Пояснение <span className="font-normal text-slate-400">(необязательно)</span></label>
            <textarea
              name="explanation"
              rows={2}
              maxLength={200}
              placeholder="Краткое пояснение для аудитории..."
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>
      )}

      {type === "qa" && (
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Вопросов от участника
          </label>
          <div className="flex items-center gap-2">
            <select
              name="max_questions"
              defaultValue="1"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1,2,3,5,10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">макс.</span>
          </div>
        </div>
      )}

      <Button type="submit" loading={isPending} className="w-full mt-1">
        Добавить опрос
      </Button>
    </form>
  );
}
