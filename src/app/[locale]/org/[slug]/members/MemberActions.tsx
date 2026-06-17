"use client";

import { useTranslations } from "next-intl";
import { removeMember, changeMemberRole } from "@/lib/actions/members";
import { Button } from "@/components/ui/Button";
import type { OrgRole } from "@/types/database";

export function MemberActions({
  memberId,
  role,
  orgSlug,
}: {
  memberId: string;
  role: OrgRole;
  orgSlug: string;
}) {
  const t = useTranslations("Org.members");

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        className="text-xs py-1 px-2"
        onClick={() => changeMemberRole(memberId, role === "owner" ? "host" : "owner", orgSlug)}
      >
        → {role === "owner" ? "Host" : "Owner"}
      </Button>
      <Button
        variant="danger"
        className="text-xs py-1 px-2"
        onClick={() => removeMember(memberId, orgSlug)}
      >
        {t("removeButton")}
      </Button>
    </div>
  );
}
