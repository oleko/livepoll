"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { saveChampionshipSettings, startChampionship, activateNextChampionshipPoll, finishChampionship } from "@/lib/actions/quiz";

type Props = {
  sessionId: string;
  orgSlug: string;
  quizPollCount: number;
  initial: {
    enabled: boolean;
    auto: boolean;
    reveal_duration: number;
  };
};

export function ChampionshipPanel({ sessionId, orgSlug, quizPollCount, initial }: Props) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [auto, setAuto] = useState(initial.auto);
  const [revealDuration, setRevealDuration] = useState(initial.reveal_duration);
  const [saving, setSaving] = useState(false);
  const [starting, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "playing" | "finished">("idle");
  const [participants, setParticipants] = useState<string[]>([]);
  const supabase = useRef(createClient());

  // Listen for participant_join to update lobby
  useEffect(() => {
    if (!enabled) return;
    const ch = supabase.current
      .channel(`champ-lobby-${sessionId}`)
      .on("broadcast", { event: "participant_join" }, ({ payload }) => {
        const data = payload as { participants: string[] };
        setParticipants(data.participants ?? []);
      })
      .on("broadcast", { event: "quiz_start" }, () => setPhase("playing"))
      .on("broadcast", { event: "quiz_finish" }, () => setPhase("finished"))
      .subscribe();
    return () => { supabase.current.removeChannel(ch); };
  }, [enabled, sessionId]);

  async function handleSave() {
    setSaving(true);
    await saveChampionshipSettings(sessionId, orgSlug, { enabled, auto, reveal_duration: revealDuration });
    setSaving(false);
  }

  if (!enabled) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">🏆 Режим чемпионата</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {quizPollCount === 0
                ? "Создайте квиз-вопросы во вкладке «🏆 Квиз»"
                : `${quizPollCount} ${quizPollCount === 1 ? "вопрос" : quizPollCount < 5 ? "вопроса" : "вопросов"} готово`}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                saveChampionshipSettings(sessionId, orgSlug, { enabled: e.target.checked, auto, reveal_duration: revealDuration });
              }}
            />
            <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus-visible:outline-2 peer-focus-visible:outline-indigo-500 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Режим чемпионата</span>
          <span className="text-xs rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 font-medium">
            {quizPollCount} {quizPollCount === 1 ? "вопрос" : quizPollCount < 5 ? "вопроса" : "вопросов"}
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              saveChampionshipSettings(sessionId, orgSlug, { enabled: e.target.checked, auto, reveal_duration: revealDuration });
            }}
          />
          <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
        </label>
      </div>

      {phase === "idle" && (
        <>
          {/* Settings */}
          <div className="flex flex-col gap-3">
            {/* Auto / Manual toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400">Переход между вопросами</span>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setAuto(true)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${auto ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
                >
                  Авто
                </button>
                <button
                  type="button"
                  onClick={() => setAuto(false)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${!auto ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
                >
                  Вручную
                </button>
              </div>
            </div>

            {/* Reveal duration (auto only) */}
            {auto && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">Показывать ответ (сек)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={5} max={30} step={5}
                    value={revealDuration}
                    onChange={(e) => setRevealDuration(Number(e.target.value))}
                    className="w-24 accent-indigo-600"
                  />
                  <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 w-6 text-right">
                    {revealDuration}
                  </span>
                </div>
              </div>
            )}

            <Button
              variant="secondary"
              className="text-xs py-1.5"
              loading={saving}
              onClick={handleSave}
            >
              Сохранить настройки
            </Button>
          </div>

          {/* Lobby participants */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Участников в лобби: <span className="font-semibold text-slate-700 dark:text-slate-300">{participants.length}</span>
            </p>
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {participants.slice(0, 20).map((name) => (
                  <span key={name} className="text-xs rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-slate-700 dark:text-slate-300">
                    {name}
                  </span>
                ))}
                {participants.length > 20 && (
                  <span className="text-xs text-slate-400">+{participants.length - 20}</span>
                )}
              </div>
            )}
            <Button
              className="w-full"
              disabled={quizPollCount === 0}
              loading={starting}
              onClick={() => startTransition(() => { void startChampionship(sessionId); })}
            >
              ▶ Начать чемпионат
            </Button>
          </div>
        </>
      )}

      {phase === "playing" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-xs text-green-700 dark:text-green-400 font-medium">Чемпионат идёт</span>
          </div>
          {!auto && (
            <Button
              loading={starting}
              onClick={() => startTransition(() => { void activateNextChampionshipPoll(sessionId); })}
            >
              ▷ Следующий вопрос
            </Button>
          )}
          <Button
            variant="danger"
            loading={starting}
            onClick={() => startTransition(() => { void finishChampionship(sessionId); })}
          >
            Завершить чемпионат
          </Button>
        </div>
      )}

      {phase === "finished" && (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <div className="text-3xl">🏆</div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Чемпионат завершён</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Итоговая таблица показана на дисплее</p>
        </div>
      )}
    </div>
  );
}
