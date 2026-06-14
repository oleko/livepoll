import Link from "next/link";
import HelpNav, { HelpNavMobile } from "./HelpNav";

export const metadata = {
  title: { template: "%s — Помощь | LivePoll AI", default: "Помощь | LivePoll AI" },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-white dark:bg-slate-950 sticky top-0 z-10">
        <Link href="/" className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          LivePoll AI
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/help" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            Центр помощи
          </Link>
          <Link href="/auth/login" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors">
            Войти →
          </Link>
        </div>
      </header>

      <HelpNavMobile />

      <div className="mx-auto w-full max-w-5xl px-6 py-6 md:py-10 md:flex md:gap-10 lg:gap-12 flex-1">
        <HelpNav />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      <footer className="border-t border-slate-200 dark:border-slate-800 px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
        © 2025 ООО «Олег Костин»
      </footer>
    </div>
  );
}
