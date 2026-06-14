"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

export function LangToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: string) {
    if (next === locale) return;
    startTransition(() => {
      if (next === "ru") {
        // Remove /en prefix from pathname
        const newPath = pathname.replace(/^\/en/, "") || "/";
        router.push(newPath);
      } else {
        // Add /en prefix
        const newPath = `/en${pathname}`;
        router.push(newPath);
      }
    });
  }

  return (
    <div className={`flex items-center gap-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 text-xs font-semibold transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <button
        onClick={() => switchLocale("ru")}
        className={`px-2 py-1 rounded-md transition-colors ${locale === "ru" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
      >
        RU
      </button>
      <button
        onClick={() => switchLocale("en")}
        className={`px-2 py-1 rounded-md transition-colors ${locale === "en" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
      >
        EN
      </button>
    </div>
  );
}
