"use client";

import { useActionState, useState } from "react";
import { createPoll } from "@/lib/actions/polls";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PollType } from "@/types/database";

const POLL_TYPES: { value: PollType; label: string; hasOptions: boolean }[] = [
  { value: "multiple_choice", label: "Множественный выбор", hasOptions: true },
  { value: "temperature",     label: "Шкала температуры",  hasOptions: false },
  { value: "like_dislike",    label: "Лайк / Дизлайк",     hasOptions: false },
  { value: "word_cloud",      label: "Облако слов",         hasOptions: false },
  { value: "emoji_cloud",     label: "Облако эмодзи",       hasOptions: false },
  { value: "planning_poker",  label: "Planning Poker",      hasOptions: false },
  { value: "qa",              label: "Q&A",                 hasOptions: false },
];

export function NewPollForm({ sessionId, orgSlug }: { sessionId: string; orgSlug: string }) {
  const [type, setType] = useState<PollType>("multiple_choice");
  const [state, action, isPending] = useActionState(createPoll, null);

  const selectedType = POLL_TYPES.find((t) => t.value === type)!;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="org_slug" value={orgSlug} />

      {state && "error" in state && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-xs text-green-400">Опрос добавлен</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">Тип опроса</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as PollType)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <label className="text-sm font-medium text-slate-300">
            Варианты ответов
            <span className="text-slate-500 font-normal ml-1">(каждый с новой строки)</span>
          </label>
          <textarea
            name="options"
            rows={4}
            placeholder={"Вариант А\nВариант Б\nВариант В"}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      )}

      <Button type="submit" loading={isPending} className="w-full mt-1">
        Добавить опрос
      </Button>
    </form>
  );
}
