"use client";

import { useTranslations } from "next-intl";
import { updateSessionStatus } from "@/lib/actions/sessions";
import { broadcastLeaderboard } from "@/lib/actions/participants";
import { Button } from "@/components/ui/Button";
import type { SessionStatus } from "@/types/database";

export function SessionControls({
  sessionId,
  status,
  orgSlug,
  hasQuizPolls = false,
}: {
  sessionId: string;
  status: SessionStatus;
  orgSlug: string;
  hasQuizPolls?: boolean;
}) {
  const t = useTranslations("Org.session.controls");

  if (status === "ended") return null;

  return status === "draft" ? (
    <Button onClick={() => updateSessionStatus(sessionId, "active", orgSlug)}>
      {t("start")}
    </Button>
  ) : (
    <div className="flex gap-2">
      {hasQuizPolls && (
        <Button
          variant="secondary"
          onClick={() => broadcastLeaderboard(sessionId)}
        >
          🏆 {t("leaderboard")}
        </Button>
      )}
      <Button
        variant="danger"
        onClick={() => {
          if (confirm(t("confirmEnd"))) {
            updateSessionStatus(sessionId, "ended", orgSlug);
          }
        }}
      >
        {t("end")}
      </Button>
    </div>
  );
}
