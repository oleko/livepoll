import Link from "next/link";

/**
 * `[locale]/layout.tsx` calls notFound() for an unknown locale, and several
 * pages call it for a missing session — until now all of them rendered the
 * stock Next.js 404.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-zinc-400 dark:text-zinc-600">404</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Страница не найдена
        </h1>
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Возможно, ссылка устарела или мероприятие уже завершилось.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
      >
        На главную
      </Link>
    </main>
  );
}
