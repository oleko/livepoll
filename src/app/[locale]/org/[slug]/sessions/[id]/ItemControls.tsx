"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";

/**
 * Two controls that split what used to be one undifferentiated row of buttons.
 *
 * A programme item has two independent states, and the old card mixed them:
 * its lifecycle (draft → running → finished) and whether it is on the
 * projector right now. That produced ten buttons whose names did not say which
 * axis they belonged to — "Завершить" and "Убрать с экрана" sound like
 * synonyms and are not, while "Итог" was a third thing that did both at once
 * (close the poll AND leave the result up).
 *
 * Now the lifecycle is one button plus a status pill, and the projector is one
 * toggle that keeps the same name in every state. "Итог" disappears as a
 * separate concept: finishing a poll that is on screen leaves its result up,
 * finishing a hidden one does not — which is what the two buttons did, minus
 * having to remember which was which.
 */

export type ItemStatus = "draft" | "live" | "closed";

export function StatusPill({ status, labels }: {
  status: ItemStatus;
  labels: { draft: string; live: string; closed: string };
}) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 shrink-0 rounded-full bg-green-50 dark:bg-green-400/10 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
        {labels.live}
      </span>
    );
  }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
      status === "closed"
        ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
    }`}>
      {status === "closed" ? labels.closed : labels.draft}
    </span>
  );
}

/**
 * One projector switch with one name.
 *
 * `canTurnOn` is false for a finished poll: showPollOnDisplay refuses anything
 * that is not active, so offering to switch it back on would be a button that
 * silently does nothing. In that state the control only turns off.
 */
export function DisplayToggle({ on, canTurnOn, onToggle, label, disabled }: {
  on: boolean;
  canTurnOn: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}) {
  if (!on && !canTurnOn) return null;
  const Icon = on ? Eye : EyeSlash;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        on
          ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      <Icon size={14} weight="bold" aria-hidden="true" />
      {label}
    </button>
  );
}
