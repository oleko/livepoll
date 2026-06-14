"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SESSION_TEMPLATES } from "@/lib/templates";

export function NewSessionForm({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createSession, null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    if (state && "redirectTo" in state) {
      try { (window as any).ym?.(Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID), "reachGoal", "session_created"); } catch {}
      router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="org_id" value={orgId} />
      <input type="hidden" name="org_slug" value={orgSlug} />
      <input type="hidden" name="template_id" value={selectedTemplate} />

      {state && "error" in state && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Template picker */}
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Шаблон <span className="text-slate-400 font-normal">(необязательно)</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Без шаблона */}
          <button
            type="button"
            onClick={() => setSelectedTemplate("")}
            className={`rounded-xl border p-3 text-left transition-colors ${
              selectedTemplate === ""
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
            }`}
          >
            <span className="text-xl block mb-1.5">✦</span>
            <p className={`text-xs font-semibold ${selectedTemplate === "" ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
              Без шаблона
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Пустое мероприятие</p>
          </button>

          {SESSION_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setSelectedTemplate(tpl.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selectedTemplate === tpl.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
              }`}
            >
              <span className="text-xl block mb-1.5">{tpl.icon}</span>
              <p className={`text-xs font-semibold leading-snug ${selectedTemplate === tpl.id ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
                {tpl.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{tpl.polls.length} опроса</p>
            </button>
          ))}
        </div>

        {/* Preview of selected template */}
        {selectedTemplate && (() => {
          const tpl = SESSION_TEMPLATES.find((t) => t.id === selectedTemplate);
          if (!tpl) return null;
          return (
            <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Будут созданы опросы:</p>
              <ul className="space-y-1">
                {tpl.polls.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-slate-300 dark:text-slate-600 shrink-0">{i + 1}.</span>
                    {p.title}
                    <span className="ml-auto shrink-0 text-slate-400">{TYPE_LABEL[p.type]}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}
      </div>

      <Input
        label="Название мероприятия"
        name="title"
        placeholder="Например: DevConf 2025"
        required
        autoFocus
      />

      <Button type="submit" loading={isPending} className="w-full">
        Создать мероприятие
      </Button>
    </form>
  );
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Выбор",
  temperature:     "Шкала",
  qa:              "Q&A",
  like_dislike:    "Лайк",
  word_cloud:      "Слова",
  emoji_cloud:     "Эмодзи",
  planning_poker:  "Покер",
};
