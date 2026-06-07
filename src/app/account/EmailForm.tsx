"use client";

import { useState, useTransition } from "react";
import { updateEmail } from "@/lib/actions/account";

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateEmail(email);
      if (r.success) {
        setMsg({ text: `Письмо с подтверждением отправлено на ${email}`, ok: true });
        setEmail("");
      } else {
        setMsg({ text: r.error!, ok: false });
      }
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Смена email</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Текущий: <span className="text-slate-700 dark:text-slate-300">{currentEmail}</span>
      </p>
      <div className="space-y-3 max-w-sm">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Новый email"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {msg && (
          <p className={`text-xs ${msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {msg.text}
          </p>
        )}
        <button
          onClick={save}
          disabled={isPending || !email.trim()}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97]"
        >
          {isPending ? "Отправляю…" : "Отправить подтверждение"}
        </button>
      </div>
    </section>
  );
}
