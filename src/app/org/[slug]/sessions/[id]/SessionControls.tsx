"use client";

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
  if (status === "ended") return null;

  return status === "draft" ? (
    <Button onClick={() => updateSessionStatus(sessionId, "active", orgSlug)}>
      ▶ Начать
    </Button>
  ) : (
    <Button
      variant="danger"
      onClick={() => {
        if (confirm("Завершить мероприятие? Голосование будет остановлено.")) {
          updateSessionStatus(sessionId, "ended", orgSlug);
        }
      }}
    >
      Завершить
    </Button>
  );
}
