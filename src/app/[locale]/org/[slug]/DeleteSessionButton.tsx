"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash } from "@phosphor-icons/react";
import { deleteSession } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/Dialog";

/**
 * Deleting a session takes its polls, votes, questions, slides and
 * participants with it — the database cascades them. So this does not ask
 * "are you sure" into the void: the dialog names the event and says what
 * disappears with it, and the confirm button is the only red thing on screen.
 *
 * A running session is refused by the server, and the button says so here
 * rather than letting the host find out by clicking.
 */
export function DeleteSessionButton({
  sessionId,
  orgSlug,
  title,
  status,
  pollCount,
  participantCount,
}: {
  sessionId: string;
  orgSlug: string;
  title: string;
  status: "draft" | "active" | "ended";
  pollCount: number;
  participantCount: number;
}) {
  const t = useTranslations("Org.dashboard.deleteSession");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isLive = status === "active";

  async function handleDelete() {
    setPending(true);
    setError(null);
    const result = await deleteSession(sessionId, orgSlug);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        disabled={isLive}
        aria-label={isLive ? t("blockedWhileLive") : t("trigger")}
        title={isLive ? t("blockedWhileLive") : t("trigger")}
        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-400 dark:disabled:hover:border-slate-700 dark:disabled:hover:bg-slate-900"
      >
        <Trash size={14} weight="bold" aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!pending) { setOpen(v); setError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogClose className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              ✕
            </DialogClose>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-5 py-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {t.rich("confirmBody", {
                name: () => <b className="font-semibold text-slate-900 dark:text-white">{title}</b>,
              })}
            </p>

            {(pollCount > 0 || participantCount > 0) && (
              <ul className="flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                {pollCount > 0 && <li>— {t("willLosePolls", { count: pollCount })}</li>}
                {participantCount > 0 && <li>— {t("willLoseParticipants", { count: participantCount })}</li>}
              </ul>
            )}

            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{t("irreversible")}</p>

            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                loading={pending}
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {t("confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
