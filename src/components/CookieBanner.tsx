"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/60 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-white">🍪 Мы используем файлы cookie</span>
          {" "}для работы сервиса и улучшения вашего опыта. Подробнее —{" "}
          <Link href="#" className="underline underline-offset-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
            Политика конфиденциальности
          </Link>
          .
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors"
          >
            Отклонить
          </button>
          <button
            onClick={accept}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
