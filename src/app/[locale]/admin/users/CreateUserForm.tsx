"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createPlatformUser } from "@/lib/actions/admin";

type FormState = { error: string } | { success: true } | null;

export function CreateUserForm() {
  const t = useTranslations("Admin.createUser");
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    async (_: FormState, formData: FormData): Promise<FormState> => {
      const result = await createPlatformUser(formData);
      if ("success" in result) setOpen(false);
      return result;
    },
    null
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
      >
        {t("trigger")}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("title")}</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {state && "error" in state && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 dark:text-red-400">
          {state.error}
        </div>
      )}

      <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("fieldName")}</label>
          <input
            name="full_name"
            type="text"
            placeholder={t("namePlaceholder")}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("fieldEmail")}</label>
          <input
            name="email"
            type="email"
            required
            placeholder="user@example.com"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("fieldPassword")}</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder={t("passwordPlaceholder")}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("fieldRole")}</label>
          <select
            name="role"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="user">{t("roleUser")}</option>
            <option value="platform_admin">{t("roleAdmin")}</option>
          </select>
        </div>

        <div className="sm:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            {isPending ? t("submitting") : t("submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
