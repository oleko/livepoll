"use client";

import { useEffect } from "react";

/**
 * A participant holds their phone and will not read a stack trace. One clear
 * line and one button — and an automatic retry, because during an event the
 * usual cause is a few seconds of bad venue wifi, not a real bug.
 */
export default function JoinError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[join error]", error.digest ?? "", error);
  }, [error]);

  useEffect(() => {
    const id = setTimeout(() => unstable_retry(), 4000);
    return () => clearTimeout(id);
  }, [unstable_retry]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Не удалось загрузить
      </h1>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Проверьте связь — мы сами попробуем ещё раз через пару секунд. Ваш голос сохранён.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
      >
        Попробовать снова
      </button>
    </main>
  );
}
