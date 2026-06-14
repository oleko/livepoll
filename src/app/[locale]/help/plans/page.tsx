import Link from "next/link";

export const metadata = { title: "Тарифы и лимиты" };

export default function PlansPage() {
  return (
    <div className="max-w-prose">
      <Link href="/help" className="py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        ← Помощь
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Тарифы и лимиты</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Что входит в каждый план и как считаются ограничения.
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Сравнение тарифов</h2>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr>
                  <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider w-44"></th>
                  <th className="text-center py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold text-xs">Бесплатный</th>
                  <th className="text-center py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold text-xs">Старт</th>
                  <th className="text-center py-2.5 px-3 text-indigo-600 dark:text-indigo-400 font-semibold text-xs bg-indigo-50 dark:bg-indigo-500/10 rounded-t-lg">Про</th>
                  <th className="text-center py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold text-xs">Команда</th>
                </tr>
                <tr>
                  <th className="px-3 pb-3"></th>
                  <th className="text-center px-3 pb-3 text-slate-400 font-normal text-xs">0 ₽</th>
                  <th className="text-center px-3 pb-3 text-slate-400 font-normal text-xs">490 ₽/мес</th>
                  <th className="text-center px-3 pb-3 text-indigo-500 dark:text-indigo-400 font-normal text-xs bg-indigo-50/50 dark:bg-indigo-500/5">990 ₽/мес</th>
                  <th className="text-center px-3 pb-3 text-slate-400 font-normal text-xs">2 490 ₽/мес</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Участников/мероприятие", free: "30",   starter: "100",  pro: "500",  team: "∞"     },
                  { label: "Мероприятий в месяц",    free: "3",    starter: "∞",    pro: "∞",    team: "∞"     },
                  { label: "Опросов в мероприятии",  free: "5",    starter: "10",   pro: "∞",    team: "∞"     },
                  { label: "Ведущих",                free: "1",    starter: "1",    pro: "1",    team: "до 5"  },
                  { label: "Все 8 типов опросов",    free: "✓",    starter: "✓",    pro: "✓",    team: "✓"     },
                  { label: "Дисплейный экран",       free: "✓",    starter: "✓",    pro: "✓",    team: "✓"     },
                  { label: "Таймер и лимит голосов", free: "✓",    starter: "✓",    pro: "✓",    team: "✓"     },
                  { label: "Шаблоны мероприятий",    free: "✓",    starter: "✓",    pro: "✓",    team: "✓"     },
                  { label: "Экспорт CSV / PDF",      free: "—",    starter: "✓",    pro: "✓",    team: "✓"     },
                  { label: "✨ AI-анализ Q&A",       free: "—",    starter: "—",    pro: "✓",    team: "✓"     },
                  { label: "Слайды и презентации",   free: "—",    starter: "—",    pro: "✓",    team: "✓"     },
                  { label: "⚪ Белый лейбл",         free: "—",    starter: "—",    pro: "—",    team: "✓"     },
                ].map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-slate-50 dark:bg-slate-900/50" : ""}>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-xs">{row.label}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 text-xs">{row.free}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 text-xs">{row.starter}</td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 dark:text-indigo-300 font-medium text-xs bg-indigo-50/50 dark:bg-indigo-500/5">{row.pro}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 text-xs">{row.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как считается лимит мероприятий</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
            Лимит считается по количеству мероприятий, <b>запущенных в текущем календарном месяце</b>.
            Черновики не засчитываются — только те мероприятия, которые были переведены в статус «Идёт».
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            На тарифах Старт, Про и Команда лимит мероприятий отсутствует.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как считается лимит участников</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Лимит участников — это максимальное количество <b>уникальных голосовавших</b> в рамках одного мероприятия.
            Считается не по числу вошедших, а по числу проголосовавших. При достижении лимита новые участники
            увидят сообщение об ограничении и не смогут отправить голос.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как считается лимит опросов</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Лимит опросов — это максимальное количество опросов <b>в одном мероприятии</b>.
            Если вы удалили опрос, место освобождается.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Что будет при достижении лимита</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Вы увидите сообщение о достижении лимита. Действующие мероприятия продолжат работать —
            ограничение касается только создания новых или новых голосующих.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как перейти на другой тариф</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            Перейдите в <b>Настройки организации</b> и нажмите <b>«Сменить тариф →»</b> —
            откроется страница с ценами и кнопками оформления. Оплата картой через ЮKassa,
            тариф активируется автоматически после подтверждения платежа.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Для тарифа «Команда» и корпоративных вопросов — напишите на{" "}
            <a href="mailto:oleko85@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              oleko85@gmail.com
            </a>.
            Текущие данные сохраняются при любом переходе.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/qa-and-ai" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Q&A и AI-анализ
        </Link>
        <Link href="/help/team" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          Команда →
        </Link>
      </div>
    </div>
  );
}
