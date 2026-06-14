"use client";

import { useTransition, useState } from "react";
import { setPlatformRole } from "@/lib/actions/admin";

export function RoleToggle({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: "user" | "platform_admin";
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(currentRole);

  function toggle() {
    if (isSelf) return;
    const next = role === "platform_admin" ? "user" : "platform_admin";
    startTransition(async () => {
      await setPlatformRole(userId, next);
      setRole(next);
    });
  }

  const isAdmin = role === "platform_admin";

  return (
    <button
      onClick={toggle}
      disabled={pending || isSelf}
      title={isSelf ? "Нельзя изменить свою роль" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        isSelf
          ? "cursor-default opacity-60"
          : "cursor-pointer hover:opacity-80"
      } ${
        isAdmin
          ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
      }`}
    >
      {pending ? "…" : isAdmin ? "Платформ-админ" : "Пользователь"}
    </button>
  );
}
