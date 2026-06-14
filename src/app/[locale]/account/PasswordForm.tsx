"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/lib/actions/account";

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function save() {
    setMsg(null);
    if (next.length < 8) { setMsg({ text: "Минимум 8 символов", ok: false }); return; }
    if (next !== confirm) { setMsg({ text: "Пароли не совпадают", ok: false }); return; }
    startTransition(async () => {
      const r = await updatePassword(current, next);
      if (r.success) {
        setMsg({ text: "Пароль изменён", ok: true });
        setCurrent(""); setNext(""); setConfirm("");
      } else {
        setMsg({ text: r.error!, ok: false });
      }
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Смена пароля</h2>
      <div className="space-y-3 max-w-sm">
        {[
          { label: "Текущий пароль", value: current, set: setCurrent },
          { label: "Новый пароль",   value: next,    set: setNext,    hint: "Минимум 8 символов" },
          { label: "Повторите новый", value: confirm, set: setConfirm },
        ].map(({ label, value, set, hint }) => (
          <div key={label}>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</label>
            <input
              type="password"
              value={value}
              onChange={e => set(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {hint && <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">{hint}</p>}
          </div>
        ))}
        {msg && (
          <p className={`text-xs ${msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {msg.text}
          </p>
        )}
        <button
          onClick={save}
          disabled={isPending || !current || !next || !confirm}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97]"
        >
          {isPending ? "Сохраняю…" : "Изменить пароль"}
        </button>
      </div>
    </section>
  );
}
