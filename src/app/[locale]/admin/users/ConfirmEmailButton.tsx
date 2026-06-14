"use client";

import { useTransition } from "react";
import { confirmUserEmail } from "@/lib/actions/admin";

export function ConfirmEmailButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      await confirmUserEmail(userId);
    });
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className="rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 transition-colors disabled:opacity-50"
    >
      {isPending ? "…" : "Подтвердить"}
    </button>
  );
}
