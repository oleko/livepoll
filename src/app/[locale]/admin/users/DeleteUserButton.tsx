"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { deleteUser } from "@/lib/actions/admin";

export function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("Admin.deleteUser");
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteUser(userId);
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">{t("confirmText", { name })}</span>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50"
        >
          {pending ? "…" : t("deleteConfirm")}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={pending}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t("cancel")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1 text-xs font-medium transition-colors"
    >
      {t("delete")}
    </button>
  );
}
