"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { slug: "getting-started", title: "Быстрый старт", icon: "🚀" },
  { slug: "participants",     title: "Для участников",     icon: "📱" },
  { slug: "poll-types",      title: "Типы опросов",        icon: "📊" },
  { slug: "display-screen",  title: "Дисплейный экран",    icon: "📺" },
  { slug: "qa-and-ai",       title: "Q&A и AI-анализ",     icon: "✨" },
  { slug: "plans",           title: "Тарифы и лимиты",     icon: "💳" },
  { slug: "team",            title: "Команда",              icon: "👥" },
];

export default function HelpNav() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 hidden md:block">
      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-3">
        Статьи
      </p>
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const href = `/help/${item.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={item.slug}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
