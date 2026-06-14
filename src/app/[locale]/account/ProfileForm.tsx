"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions/account";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateProfile(name);
      setMsg(r.success ? { text: "Имя сохранено", ok: true } : { text: r.error!, ok: false });
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Профиль</h2>
      <div className="space-y-3 max-w-sm">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Имя</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Email</label>
          <input
            value={email}
            disabled
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
          />
        </div>
        {msg && (
          <p className={`text-xs ${msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {msg.text}
          </p>
        )}
        <button
          onClick={save}
          disabled={isPending || name.trim() === initialName}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97]"
        >
          {isPending ? "Сохраняю…" : "Сохранить"}
        </button>
      </div>
    </section>
  );
}
