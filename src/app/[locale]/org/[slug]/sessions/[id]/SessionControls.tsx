"use client";

import { useTranslations } from "next-intl";
import { updateSessionStatus } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/Button";
import type { SessionStatus } from "@/types/database";

export function SessionControls({
  sessionId,
  status,
  orgSlug,
}: {
  sessionId: string;
  status: SessionStatus;
  orgSlug: string;
}) {
  const t = useTranslations("Org.session.controls");

  if (status === "ended") return null;

  return status === "draft" ? (
    <Button onClick={() => updateSessionStatus(sessionId, "active", orgSlug)}>
      {t("start")}
    </Button>
  ) : (
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
  );
}
