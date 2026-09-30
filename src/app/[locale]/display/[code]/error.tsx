"use client";

import { useEffect, useState } from "react";

/**
 * The projector is unattended: it hangs on a wall with nobody watching for a
 * "Try again" button. So this boundary retries on its own on a short cycle and
 * only explains itself while it waits. The host keeps seeing the event branding
 * rather than a white crash page in front of the room.
 */
const RETRY_AFTER_S = 5;

export default function DisplayError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [left, setLeft] = useState(RETRY_AFTER_S);

  useEffect(() => {
    console.error("[display error]", error.digest ?? "", error);
  }, [error]);

  useEffect(() => {
    const id = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          unstable_retry();
          return RETRY_AFTER_S;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [unstable_retry]);

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-slate-950 px-8 text-center text-white">
      <h1 className="text-[clamp(1.5rem,4vh,2.5rem)] font-semibold">
        Экран временно недоступен
      </h1>
      <p className="max-w-2xl text-[clamp(0.9rem,2vh,1.25rem)] text-slate-400">
        Восстанавливаем соединение. Голосование участников продолжается — ничего не потеряно.
      </p>
      <p className="text-[clamp(0.8rem,1.6vh,1rem)] text-slate-600 tabular-nums">
        Повтор через {left} с
      </p>
      <button
        onClick={() => unstable_retry()}
        className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 transition hover:bg-slate-900"
      >
        Повторить сейчас
      </button>
    </main>
  );
}
