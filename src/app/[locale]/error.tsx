"use client";

import { useEffect } from "react";

/**
 * The app had no error boundary of any kind, so an uncaught exception during
 * render showed the bare Next.js overlay in development and a blank frame in
 * production. This is the general one; the two hall screens have their own,
 * because a host mid-event needs the screen to come back on its own rather
 * than wait for someone to notice a button.
 */
export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[render error]", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Что-то пошло не так
        </h1>
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Страница не загрузилась. Обычно помогает повторная попытка — данные не потеряны.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-600">
            код ошибки: {error.digest}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Попробовать снова
        </button>
        {/* Deliberately a plain anchor, not next/link: we are inside an error
            boundary, and a full document load is what clears whatever client
            router state got the app here. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          На главную
        </a>
      </div>
    </main>
  );
}
