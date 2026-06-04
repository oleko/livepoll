"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, signInWithYandex } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(
    async (_: unknown, formData: FormData) => signUp(formData),
    null
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 pb-16">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LivePoll AI</h1>
          <p className="mt-1 text-sm text-slate-500">Создайте аккаунт</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          {state?.error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 dark:text-red-400">
              {state.error}
            </div>
          )}

          <form action={action} className="flex flex-col gap-4">
            <Input
              label="Имя"
              name="full_name"
              type="text"
              autoComplete="name"
              placeholder="Иван Иванов"
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <Input
              label="Пароль"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Минимум 8 символов"
              minLength={8}
              required
            />
            <Button type="submit" loading={isPending} className="w-full mt-2">
              Создать аккаунт
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-xs text-slate-500">или</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <form action={signInWithYandex} className="mt-4">
            <Button type="submit" variant="secondary" className="w-full gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M13.502 2H10.9C7.22 2 5.046 3.988 5.046 7.2c0 2.648 1.234 4.23 3.57 5.786L5 21.994h3.018l3.395-8.57.94.586L15.49 22h3.18l-3.603-9.407C16.92 11.014 18.5 9.05 18.5 6.2 18.5 3.464 16.576 2 13.502 2zm-.495 9.168h-1.4V4.4h1.4c2.02 0 3.074 1.01 3.074 3.25 0 2.398-1.054 3.518-3.074 3.518z" />
              </svg>
              Зарегистрироваться через Яндекс
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Уже есть аккаунт?{" "}
          <Link href="/auth/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}
