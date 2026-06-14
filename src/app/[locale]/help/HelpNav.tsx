"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export function HelpNavMobile() {
  const pathname = usePathname();
  return (
    <div className="md:hidden overflow-x-auto border-b border-slate-100 dark:border-slate-800 px-4 pb-0">
      <nav className="flex gap-1.5 w-max py-3">
        {NAV_ITEMS.map((item) => {
          const href = `/help/${item.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={item.slug}
              href={href}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span className="text-sm leading-none">{item.icon}</span>
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function HelpNav() {
  const pathname = usePathname();

  return (
    <aside className="md:w-44 lg:w-52 shrink-0 hidden md:block">
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