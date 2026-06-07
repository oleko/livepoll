import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RoleToggle } from "./RoleToggle";
import { DeleteUserButton } from "./DeleteUserButton";
import { CreateUserForm } from "./CreateUserForm";
import { ConfirmEmailButton } from "./ConfirmEmailButton";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, platform_role, created_at")
    .order("created_at", { ascending: false });

  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailById = Object.fromEntries(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
  const confirmedById = Object.fromEntries(
    (authUsers?.users ?? []).map((u) => [u.id, !!u.email_confirmed_at])
  );

  const admins = (profiles ?? []).filter((p) => p.platform_role === "platform_admin");
  const users = (profiles ?? []).filter((p) => p.platform_role !== "platform_admin");

  return (
    <div className="flex flex-col gap-8">
      <CreateUserForm />

      {/* Platform admins */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Платформ-администраторы
            <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">{admins.length}</span>
          </h2>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Имя</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Зарегистрирован</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {admins.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                    {p.full_name ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                    {emailById[p.id] ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-400 dark:text-slate-500">
                    {new Date(p.created_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-5 py-4">
                    {confirmedById[p.id] ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Подтверждён</span>
                    ) : (
                      <ConfirmEmailButton userId={p.id} />
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <RoleToggle
                        userId={p.id}
                        currentRole={p.platform_role}
                        isSelf={p.id === me?.id}
                      />
                      {p.id !== me?.id && (
                        <DeleteUserButton userId={p.id} name={p.full_name ?? emailById[p.id] ?? p.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 dark:text-slate-600">
                    Нет администраторов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regular users */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Пользователи
            <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">{users.length}</span>
          </h2>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Имя</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Зарегистрирован</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                    {p.full_name ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                    {emailById[p.id] ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-400 dark:text-slate-500">
                    {new Date(p.created_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-5 py-4">
                    {confirmedById[p.id] ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Подтверждён</span>
                    ) : (
                      <ConfirmEmailButton userId={p.id} />
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <RoleToggle
                        userId={p.id}
                        currentRole={p.platform_role}
                        isSelf={false}
                      />
                      <DeleteUserButton userId={p.id} name={p.full_name ?? emailById[p.id] ?? p.id} />
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 dark:text-slate-600">
                    Нет пользователей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
