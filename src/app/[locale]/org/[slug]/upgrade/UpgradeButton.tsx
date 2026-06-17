"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createUpgradeOrder } from "@/lib/actions/billing";

export function UpgradeButton({
  orgId,
  plan,
  orgSlug,
  label,
  className,
}: {
  orgId: string;
  plan: string;
  orgSlug: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const t = useTranslations("Org.upgrade");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createUpgradeOrder(orgId, plan, orgSlug);
      if (result.error) {
        setError(result.error);
      } else if (result.redirect) {
        router.push(result.redirect);
      } else if (result.manual) {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 text-center leading-relaxed">
        {t("requestDone")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className={className}
      >
        {isPending ? t("requesting") : label}
      </button>
    </div>
  );
}
