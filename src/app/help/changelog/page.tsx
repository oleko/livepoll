import Link from "next/link";

export const metadata = { title: "История обновлений" };

type ChangeType = "new" | "improved" | "fixed";

type Release = {
  version: string;
  date: string;
  label?: string;
  items: { type: ChangeType; text: string }[];
};

const RELEASES: Release[] = [
  {
    version: "0.5",
    date: "29 мая 2026",
    label: "Текущая версия",
    items: [
      { type: "new",      text: "Секции и дни внутри мероприятия — разбивайте опросы по логическим блокам: «День 1», «Утренний блок», «Панель»" },
      { type: "new",      text: "Белая метка (White Label) — скройте брендинг LivePoll AI, замените на бренд вашей компании" },
      { type: "new",      text: "История обновлений — этот раздел" },
      { type: "improved", text: "Экспорт PDF и CSV учитывает секции: каждый блок идёт с заголовком" },
    ],
  },
  {
    version: "0.4",
    date: "23 мая 2026",
    items: [
      { type: "new",      text: "Брендинг: загрузка логотипа, выбор цвета акцента, фон и заголовок дисплейного экрана" },
      { type: "new",      text: "Экспорт результатов в PDF (для презентаций) и CSV (для Excel / Google Sheets)" },
      { type: "new",      text: "Переработанная Q&A-панель: полноэкранный модал с фильтрами (ожидают / отвечены / скрытые) и поиском" },
      { type: "new",      text: "Безлимитный тариф для корпоративных клиентов — без ограничений по сессиям, опросам и участникам" },
      { type: "improved", text: "Вопросы Q&A теперь можно закрепить на дисплее — показывается текущий вопрос крупным шрифтом" },
    ],
  },
  {
    version: "0.3",
    date: "22 мая 2026",
    items: [
      { type: "new",      text: "Квиз-режим: пометьте правильный ответ в Multiple Choice — после закрытия аудитория увидит результат и пояснение" },
      { type: "new",      text: "Множественный выбор ответов — настройте до 5 вариантов для одного участника" },
      { type: "new",      text: "Таймер-объявление: ведущий вводит текст и время паузы, участники и дисплей видят обратный отсчёт" },
      { type: "new",      text: "Шаблоны мероприятий — Ретроспектива, Конференция, Тренинг, Встреча команды" },
      { type: "new",      text: "Копирование опросов между мероприятиями — кнопка ⎘ на каждом опросе" },
      { type: "new",      text: "Центр помощи — 7 статей с инструкциями для ведущих и участников" },
      { type: "improved", text: "Лимит голосов на опрос: голосование автоматически закрывается при достижении порога" },
    ],
  },
  {
    version: "0.2",
    date: "21 мая 2026",
    items: [
      { type: "new",      text: "Управление командой: приглашайте коллег с ролью «Ведущий», несколько человек могут вести одну организацию" },
      { type: "new",      text: "Пульс зала: кнопка 🔥 у участников, счётчик активности на дисплее в реальном времени" },
      { type: "new",      text: "AI-анализ вопросов Q&A: краткое резюме и топ-вопросы за одну кнопку (Gemini 2.5 Flash)" },
      { type: "new",      text: "Planning Poker — седьмой тип опроса для оценки задач командой" },
      { type: "improved", text: "Дисплейный экран: таймер опроса, QR-код для участников, статус LIVE" },
      { type: "improved", text: "Разрешить переголосовать — опциональная настройка для каждого опроса" },
    ],
  },
  {
    version: "0.1",
    date: "20 мая 2026",
    label: "Первый запуск",
    items: [
      { type: "new", text: "Платформа LivePoll AI: создавайте мероприятия и опросы, участники голосуют без регистрации по коду" },
      { type: "new", text: "6 типов опросов: Множественный выбор, Шкала температуры, Q&A, Лайк/Дизлайк, Облако слов, Облако эмодзи" },
      { type: "new", text: "Реалтайм: голоса отображаются мгновенно без перезагрузки страницы" },
      { type: "new", text: "Дисплейный экран для проектора с результатами и QR-кодом" },
      { type: "new", text: "Три тарифа: Бесплатный, Стандарт, Про" },
      { type: "new", text: "Авторизация через email/пароль и Яндекс OAuth" },
    ],
  },
];

const TYPE_CONFIG: Record<ChangeType, { icon: string; label: string; color: string }> = {
  new:      { icon: "🆕", label: "Новое",    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
  improved: { icon: "⚡", label: "Улучшено", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" },
  fixed:    { icon: "🐛", label: "Исправлено", color: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
};

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/help" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        ← Помощь
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">История обновлений</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Все новые функции, улучшения и исправления по версиям.
      </p>

      <div className="flex gap-3 mb-10 flex-wrap">
        {(Object.entries(TYPE_CONFIG) as [ChangeType, typeof TYPE_CONFIG[ChangeType]][]).map(([, cfg]) => (
          <span key={cfg.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.color}`}>
            <span>{cfg.icon}</span>
            {cfg.label}
          </span>
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-[5.5rem] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex flex-col gap-10">
          {RELEASES.map((release) => (
            <div key={release.version} className="flex gap-6">
              <div className="w-20 shrink-0 text-right pt-0.5">
                <p className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                  v{release.version}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-600 leading-tight mt-0.5">
                  {release.date}
                </p>
              </div>

              <div className="relative pl-6 flex-1 min-w-0">
                <div className="absolute left-[-1.5px] top-1.5 h-3 w-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-950" />

                {release.label && (
                  <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-3">
                    {release.label}
                  </span>
                )}

                <ul className="flex flex-col gap-2">
                  {release.items.map((item, i) => {
                    const cfg = TYPE_CONFIG[item.type];
                    return (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold shrink-0 mt-0.5 ${cfg.color}`}
                          title={cfg.label}
                        >
                          {cfg.icon}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {item.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Есть идея или нашли баг?{" "}
          <a href="mailto:hello@livepoll.ai" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Напишите нам
          </a>
        </p>
      </div>
    </div>
  );
}
