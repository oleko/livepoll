import Link from "next/link";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          ← Kvoroom
        </Link>
      </div>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-800 px-6 py-6 text-center text-xs text-slate-400">
        © 2025 ООО «Олег Костин»
      </footer>
    </div>
  );
}
