import Link from "next/link";
import { getLocale } from "next-intl/server";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const locale = await getLocale();
  const isEn = locale === "en";
  return (
    <div className="max-w-prose">
      <Link href="/help" className="py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        {isEn ? "← Help" : "← Помощь"}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{isEn ? "Team" : "Команда"}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        {isEn ? "Give colleagues access to your organization's events." : "Дайте коллегам доступ к мероприятиям вашей организации."}
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Зачем добавлять участников</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            По умолчанию мероприятиями управляете только вы. Если в организации есть несколько ведущих —
            добавьте их в команду. Они получат полный доступ: создавать мероприятия, запускать опросы,
            управлять Q&A в реальном времени.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как пригласить участника</h2>
          <ol className="space-y-3">
            {[
              "Откройте раздел «Команда» в навигации (доступен владельцу организации).",
              "Нажмите «Пригласить участника» и введите email коллеги.",
              "Коллега получит письмо со ссылкой для входа. После регистрации или входа он окажется в вашей организации.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Роли</h2>
          <div className="space-y-3">
            <RoleCard
              role="Владелец"
              desc="Полные права: создание мероприятий, управление опросами, приглашение и удаление участников, изменение настроек организации. При регистрации роль присваивается автоматически."
            />
            <RoleCard
              role="Участник"
              desc="Может создавать и вести мероприятия, управлять опросами и Q&A. Не может приглашать других пользователей и менять настройки организации."
            />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Лимит участников по тарифу</h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {[
              { plan: "Бесплатный", limit: "1 участник (только вы)" },
              { plan: "Стандарт",   limit: "до 5 участников"         },
              { plan: "Про",        limit: "до 10 участников"         },
            ].map(({ plan, limit }, i) => (
              <div
                key={plan}
                className={`flex justify-between items-center px-4 py-3 text-sm ${
                  i > 0 ? "border-t border-slate-200 dark:border-slate-800" : ""
                }`}
              >
                <span className="text-slate-600 dark:text-slate-300">{plan}</span>
                <span className="text-slate-500 dark:text-slate-400">{limit}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            При достижении лимита появится сообщение об ошибке. Чтобы добавить больше участников,
            перейдите на следующий тариф.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как удалить участника</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            В разделе «Команда» найдите участника и нажмите кнопку удаления.
            После этого он потеряет доступ ко всем мероприятиям организации.
            Уже созданные им мероприятия и результаты опросов сохраняются.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/plans" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Тарифы и лимиты
        </Link>
        <Link href="/help" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          Все статьи →
        </Link>
      </div>
    </div>
  );
}

function RoleCard({ role, desc }: { role: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{role}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
    </div>
  );
}
