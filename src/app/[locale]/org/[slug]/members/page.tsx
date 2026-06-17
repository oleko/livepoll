import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InviteMemberForm } from "./InviteMemberForm";
import { MemberActions } from "./MemberActions";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const t = await getTranslations("Org.members");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!org) redirect("/onboarding");

  const { data: currentMember } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (currentMember?.role !== "owner") redirect(`/org/${slug}`);

  const { data: members } = await admin
    .from("organization_members")
    .select("id, role, accepted_at, user_id, profiles(full_name, email: id)")
    .eq("organization_id", org.id)
    .order("created_at");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {members?.map((m) => {
              const profile = m.profiles as { full_name: string | null; email: string } | null;
              return (
                <div key={m.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {profile?.full_name ?? "—"}
                      {m.user_id === user.id && (
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{t("you")}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {m.accepted_at ? (
                        <span className="capitalize">{m.role}</span>
                      ) : (
                        <span className="text-amber-500 dark:text-amber-400">{t("invitePending")}</span>
                      )}
                    </p>
                  </div>
                  {m.user_id !== user.id && (
                    <MemberActions
                      memberId={m.id}
                      role={m.role}
                      orgSlug={slug}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("inviteSection")}</h2>
            <InviteMemberForm orgId={org.id} orgSlug={slug} invitedBy={user.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
