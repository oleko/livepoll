import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { NewSessionForm } from "./NewSessionForm";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!org) redirect(`/org/${slug}`);

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Новое мероприятие</h1>
        <p className="mt-1 text-sm text-slate-500">
          После создания добавьте опросы и активируйте мероприятие
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <NewSessionForm orgId={org.id} orgSlug={slug} />
      </div>
    </div>
  );
}
