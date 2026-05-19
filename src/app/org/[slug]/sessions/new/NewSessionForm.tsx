"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function NewSessionForm({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createSession, null);

  useEffect(() => {
    if (state && "redirectTo" in state) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="org_id" value={orgId} />
      <input type="hidden" name="org_slug" value={orgSlug} />

      {state && "error" in state && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <Input
        label="Название мероприятия"
        name="title"
        placeholder="Например: DevConf 2025"
        required
        autoFocus
      />
      <Button type="submit" loading={isPending} className="w-full mt-2">
        Создать мероприятие
      </Button>
    </form>
  );
}
