"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  saveChampionshipSettings,
  startChampionship,
  activateNextChampionshipPoll,
  finishChampionship,
} from "@/lib/actions/quiz";
import { QuizQuestionForm } from "./QuizQuestionForm";

type QuizPoll = { id: string; title: string; settings?: Record<string, unknown> | null };

type Props = {
  sessionId: string;
  orgSlug: string;
  quizPolls: QuizPoll[];
  initial: { enabled: boolean; auto: boolean; reveal_duration: number };
  sessionStatus: "draft" | "active" | "ended";
};

export function QuizTab({ sessionId, orgSlug, quizPolls, initial, sessionStatus }: Props) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [auto, setAuto] = useState(initial.auto);
  const [revealDuration, setRevealDuration] = useState(initial.reveal_duration);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [starting, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "playing" | "finished">("idle");
  const [lobbyCount, setLobbyCount] = useState(0);
  const supabase = useRef(createClient());

  useEffect(() => {
    const ch = supabase.current
      .channel(`champ-lobby-${sessionId}`)
      .on("broadcast", { event: "participant_join" }, ({ payload }) => {
        const data = payload as { participants: string[] };
        setLobbyCount((data.participants ?? []).length);
      })
      .on("broadcast", { event: "quiz_start" }, () => setPhase("playing"))
      .on("broadcast", { event: "quiz_finish" }, () => setPhase("finished"))
      .subscribe();
    return () => { supabase.current.removeChannel(ch); };
  }, [sessionId]);

  async function handleSave() {
    setSaving(true);
    await saveChampionshipSettings(sessionId, orgSlug, { enabled, auto, reveal_duration: revealDuration });
    setSaving(false);
    setSettingsOpen(false);
  }

  function handleToggleEnabled(val: boolean) {
    setEnabled(val);
    void saveChampionshipSettings(sessionId, orgSlug, { enabled: val, auto, reveal_duration: revealDuration });
  }

  const canStart = sessionStatus === "active" && quizPolls.length > 0;
  const startHint = canStart
    ? null
    : sessionStatus !== "active"
      ? "Активируйте мероприятие для запуска"
      : "Добавьте хотя бы один вопрос";

  return (
    <div className="flex flex-col gap-5">

      {/* ── Зона 1: Список вопросов ──────────────────────────────────────────── */}
      {quizPolls.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-600 text-center py-3">
          Добавьте первый квиз-вопрос в форме ниже
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {quizPolls.map((poll, idx) => {
            const dur = (poll.settings as { duration?: number } | null)?.duration ?? 30;
            return (
              <li
                key={poll.id}
                className="flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2"
              >
                <span className="text-[11px] font-mono text-slate-400 shrink-0 w-4 text-right">
                  {idx + 1}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">
                  {poll.title}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-600 shrink-0">
                  {dur} с
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* ── Зона 2: Управление чемпионатом ───────────────────────────────────── */}
      <div className="flex flex-col gap-3">

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Режим чемпионата
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
            />
            <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>

        {enabled && (
          <>
            {/* Settings collapsible */}
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-fit"
            >
              <span className={`text-[10px] transition-transform duration-150 ${settingsOpen ? "rotate-90" : ""}`}>▶</span>
              ⚙ Настройки
            </button>

            {settingsOpen && (
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Переход</span>
                  <div className="flex items-center gap-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 p-0.5">
                    {([["Авто", true], ["Вручную", false]] as const).map(([label, val]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setAuto(val)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                          auto === val
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {auto && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Показ ответа</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={5} max={30} step={5}
                        value={revealDuration}
                        onChange={(e) => setRevealDuration(Number(e.target.value))}
                        className="w-24 accent-indigo-600"
                      />
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 w-8 text-right">
                        {revealDuration} с
                      </span>
                    </div>
                  </div>
                )}

                <Button variant="secondary" className="text-xs py-1.5" loading={saving} onClick={handleSave}>
                  Сохранить
                </Button>
              </div>
            )}

            {/* Phase: idle */}
            {phase === "idle" && (
              <div className="flex flex-col gap-2">
                {lobbyCount > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    👥 {lobbyCount} {lobbyCount === 1 ? "участник" : lobbyCount < 5 ? "участника" : "участников"} в лобби
                  </p>
                )}
                <Button
                  className="w-full"
                  disabled={!canStart}
                  loading={starting}
                  onClick={() => startTransition(() => { void startChampionship(sessionId); })}
                >
                  ▶ Начать чемпионат
                </Button>
                {startHint && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center">{startHint}</p>
                )}
              </div>
            )}

            {/* Phase: playing */}
            {phase === "playing" && (
              <div className="flex flex-col gap-2">
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

            {/* Phase: finished */}
            {phase === "finished" && (
              <div className="flex flex-col items-center gap-1 py-2 text-center">
                <div className="text-2xl">🏆</div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Чемпионат завершён</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Итоги на дисплейном экране</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* ── Зона 3: Форма добавления вопроса ────────────────────────────────── */}
      <QuizQuestionForm sessionId={sessionId} orgSlug={orgSlug} />

    </div>
  );
}
