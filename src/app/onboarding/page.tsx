"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function OnboardingPage() {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createOrganization, null);

  useEffect(() => {
    if (state && "redirectTo" in state) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl">
            🎯
          </div>
          <h1 className="text-2xl font-bold text-white">Создайте организацию</h1>
          <p className="mt-2 text-sm text-slate-400">
            Организация объединяет ваших ведущих и мероприятия
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          {state && "error" in state && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {state.error}
            </div>
          )}

          <form action={action} className="flex flex-col gap-4">
            <Input
              label="Название организации"
              name="name"
              type="text"
              placeholder="Например: Моя конференция"
              required
              autoFocus
            />
            <p className="text-xs text-slate-500 -mt-2">
              Можно изменить позже в настройках
            </p>
            <Button type="submit" loading={isPending} className="w-full mt-2">
              Создать и продолжить →
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
