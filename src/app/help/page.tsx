import Link from "next/link";
import { NAV_ITEMS } from "./nav-items";

export const metadata = { title: "Центр помощи | LivePoll AI" };

const DESCRIPTIONS: Record<string, string> = {
  "getting-started": "Создайте первое мероприятие и проведите голосование за пять минут",
  "participants":     "Как подключиться и проголосовать без регистрации и приложений",
  "poll-types":       "Описание всех восьми форматов голосований и когда их применять",
  "display-screen":   "Экран для проектора: что показывает и как открыть",
  "slides":           "Заставки, карточки спикеров, расписание и финальный экран для проектора",
  "qa-and-ai":        "Вопросы из зала, голосование за них и AI-анализ тем",
  "plans":            "Что входит в каждый тариф и как считаются лимиты",
  "team":             "Добавление участников организации и управление доступом",
  "account":          "Смена имени, email, пароля и удаление аккаунта",
  "changelog":        "История изменений платформы — новые функции и улучшения по версиям",
};

export default function HelpIndexPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Центр помощи</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Всё необходимое для работы с LivePoll AI — от первого запуска до настройки команды.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.slug}
            href={`/help/${item.slug}`}
            className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="text-2xl mb-3">{item.icon}</div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {item.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {DESCRIPTIONS[item.slug]}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Остались вопросы?</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Напишите нам на{" "}
          <a href="mailto:oleko85@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            oleko85@gmail.com
          </a>{" "}
          — ответим в течение рабочего дня.
        </p>
      </div>
    </div>
  );
}
