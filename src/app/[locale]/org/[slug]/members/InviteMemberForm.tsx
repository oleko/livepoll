"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { inviteMember } from "@/lib/actions/members";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function InviteMemberForm({
  orgId,
  orgSlug,
  invitedBy,
}: {
  orgId: string;
  orgSlug: string;
  invitedBy: string;
}) {
  const t = useTranslations("Org.members");
  const [state, action, isPending] = useActionState(inviteMember, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="org_id" value={orgId} />
      <input type="hidden" name="org_slug" value={orgSlug} />
      <input type="hidden" name="invited_by" value={invitedBy} />

      {state && "error" in state && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-xs text-green-400">{t("inviteSuccess")}</p>
      )}

      <Input
        name="email"
        type="email"
        placeholder="email@example.com"
        required
      />
      <Button type="submit" loading={isPending} className="w-full">
        {t("inviteButton")}
      </Button>
    </form>
  );
}
