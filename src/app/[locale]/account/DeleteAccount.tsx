"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/lib/actions/account";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteAccount();
    });
  }

  return (
    <section className="rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Удаление аккаунта</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Удаляет аккаунт, все мероприятия, опросы и данные участников без возможности восстановления.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2 text-sm font-medium transition-colors"
        >
          Удалить аккаунт
        </button>
      ) : (
        <div className="space-y-3 max-w-sm">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Введите <span className="font-mono font-semibold">удалить</span> для подтверждения:
          </p>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="удалить"
            className="w-full rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending || confirm !== "удалить"}
              className="rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97]"
            >
              {isPending ? "Удаляю…" : "Удалить навсегда"}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirm(""); }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
