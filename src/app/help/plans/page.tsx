import Link from "next/link";

export const metadata = { title: "Тарифы и лимиты" };

export default function PlansPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/help" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
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
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider w-48"></th>
                  <th className="text-center py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold">Бесплатный</th>
                  <th className="text-center py-2.5 px-3 text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-500/10 rounded-t-lg">Стандарт</th>
                  <th className="text-center py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold">Про</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Мероприятий в месяц",  free: "3",   pro: "5",   team: "20"  },
                  { label: "Опросов в мероприятии", free: "5",   pro: "15",  team: "30"  },
                  { label: "Членов команды",         free: "1",   pro: "до 5", team: "до 10" },
                  { label: "Типов опросов",          free: "все", pro: "все", team: "все" },
                  { label: "Дисплейный экран",       free: "✓",   pro: "✓",   team: "✓"   },
                  { label: "Таймер и лимит голосов", free: "✓",   pro: "✓",   team: "✓"   },
                  { label: "AI-анализ Q&A",          free: "✓",   pro: "✓",   team: "✓"   },
                  { label: "Командная работа",       free: "—",   pro: "✓",   team: "✓"   },
                ].map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-slate-50 dark:bg-slate-900/50" : ""}>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{row.label}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">{row.free}</td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-indigo-500/5">{row.pro}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">{row.team}</td>
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
            Мероприятия из прошлого месяца не влияют на текущий счётчик. В начале каждого месяца
            лимит обнуляется.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как считается лимит опросов</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Лимит опросов — это максимальное количество опросов <b>в одном мероприятии</b>,
            а не суммарно за всё время. Если вы удалили опрос, место освобождается.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Что будет при достижении лимита</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Вы увидите сообщение о достижении лимита. Действующие мероприятия продолжат работать —
            ограничение касается только создания новых.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как перейти на другой тариф</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Напишите нам на{" "}
            <a href="mailto:oleko85@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              oleko85@gmail.com
            </a>{" "}
            — подберём подходящий вариант и активируем план. Текущие данные сохраняются при любом переходе.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/qa-and-ai" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Q&A и AI-анализ
        </Link>
        <Link href="/help/team" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Команда →
        </Link>
      </div>
    </div>
  );
}
