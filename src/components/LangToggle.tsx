"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";

export function LangToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: "ru" | "en") {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
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
