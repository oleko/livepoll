import Link from "next/link";

export const metadata = { title: "Типы опросов" };

const TYPES = [
  {
    icon: "📊",
    name: "Множественный выбор",
    when: "Когда нужно выбрать один вариант из нескольких. Самый универсальный тип.",
    how: "Участник выбирает один из вариантов, которые вы задали заранее. На экране — живая горизонтальная гистограмма с процентами.",
    examples: ["Какую тему разобрать подробнее?", "Какой из инструментов вы используете?", "Проголосуйте за следующий спикер"],
    settings: ["До 20 вариантов ответа", "Таймер: автозакрытие по времени", "Лимит голосов: закрыть после N проголосовавших"],
  },
  {
    icon: "🌡️",
    name: "Шкала температуры",
    when: "Когда нужно измерить настроение или уровень согласия — от очень плохо до отлично.",
    how: "Участник выбирает значение от 1 до 10. На экране отображается среднее значение с индикатором.",
    examples: ["Как оцениваете качество доклада?", "Насколько вы уверены в принятом решении?", "Насколько тема актуальна для вас?"],
    settings: ["Таймер", "Лимит голосов"],
  },
  {
    icon: "👍",
    name: "Лайк / Дизлайк",
    when: "Для быстрой бинарной реакции: да или нет, нравится или нет.",
    how: "Участник нажимает 👍 или 👎. На экране видно соотношение в процентах.",
    examples: ["Согласны с таким решением?", "Выпускаем релиз на этой неделе?", "Оставляем эту функцию в продукте?"],
    settings: ["Таймер", "Лимит голосов"],
  },
  {
    icon: "☁️",
    name: "Облако слов",
    when: "Когда хотите собрать свободные ответы и визуально выделить самые популярные.",
    how: "Участник вводит слово или короткую фразу. На экране строится облако слов: чем чаще встречается слово — тем оно крупнее.",
    examples: ["Ваша главная боль в работе?", "Одним словом: каким был этот год?", "Что узнали нового на конференции?"],
    settings: ["Таймер", "Лимит голосов"],
  },
  {
    icon: "😊",
    name: "Облако эмодзи",
    when: "Для эмоциональной реакции зала — быстрой и наглядной.",
    how: "Участник выбирает один эмодзи из набора. На экране отображаются все эмодзи и количество каждого.",
    examples: ["Как вы себя чувствуете?", "Реакция на предложение", "Оцените спикера"],
    settings: ["Таймер", "Лимит голосов"],
  },
  {
    icon: "🃏",
    name: "Planning Poker",
    when: "Для командной оценки задач без давления авторитетов — каждый называет оценку независимо.",
    how: "Участники выбирают карту с оценкой (1, 2, 3, 5, 8, 13, 21, ∞, ?). Результаты скрыты до закрытия опроса, затем раскрываются все сразу. Показывается разброс и среднее.",
    examples: ["Оцените задачу в Story Points", "Насколько сложна эта фича?"],
    settings: ["Таймер", "Лимит голосов"],
  },
  {
    icon: "❓",
    name: "Q&A",
    when: "Для сессии вопросов и ответов: участники пишут вопросы, голосуют за чужие, ведущий модерирует.",
    how: "Участники отправляют вопросы в любой момент. Другие могут голосовать за вопросы (▲). Ведущий видит все вопросы, отсортированные по популярности, и решает, какой вынести на экран. AI может выделить ключевые темы одной кнопкой.",
    examples: ["Открытая Q&A после доклада", "Анонимные вопросы на тренинге", "Сбор тем для следующей встречи"],
    settings: ["Нет таймера: Q&A живёт весь сеанс", "AI-анализ по кнопке"],
  },
];

export default function PollTypesPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/help" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        ← Помощь
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Типы опросов</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Семь форматов — под любой сценарий выступления.
      </p>

      <div className="space-y-6">
        {TYPES.map((t) => (
          <div key={t.name} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <span className="text-2xl">{t.icon}</span>
              <h2 className="font-semibold text-slate-900 dark:text-white">{t.name}</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Когда использовать</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t.when}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Как работает</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t.how}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Примеры вопросов</p>
                <ul className="space-y-1">
                  {t.examples.map((ex) => (
                    <li key={ex} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="text-indigo-400 shrink-0">—</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {t.settings.map((s) => (
                  <span key={s} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/getting-started" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Быстрый старт
        </Link>
        <Link href="/help/display-screen" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Дисплейный экран →
        </Link>
      </div>
    </div>
  );
}
