"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(
    async (_: unknown, formData: FormData) => signUp(formData),
    null
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
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
