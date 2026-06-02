import Link from "next/link";

export const metadata = { title: "Типы опросов" };

const TYPES = [
  {
    icon: "📊",
    name: "Множественный выбор",
    when: "Когда нужно выбрать один или несколько вариантов из нескольких. Самый универсальный тип.",
    how: "Участник выбирает вариант(ы) из списка, который вы задали заранее. На экране — живая гистограмма с числом голосов и процентами по каждому варианту. При множественном выборе участник отмечает несколько вариантов и подтверждает одной кнопкой.",
    examples: ["Какую тему разобрать подробнее?", "Какой из инструментов вы используете?", "Выберите до 3 форматов, которые вам интересны"],
    settings: ["До 20 вариантов ответа", "Вариантов выбора: 1–5 (множественный выбор)", "🎯 Квиз-режим: правильный ответ + пояснение", "Таймер: автозакрытие по времени", "Лимит голосов: закрыть после N проголосовавших", "Разрешить переголосовать", "Редактирование вопроса в первые 10 минут"],
  },
  {
    icon: "🌡️",
    name: "Шкала температуры",
    when: "Когда нужно измерить настроение или уровень согласия — от очень плохо до отлично.",
    how: "Участник выбирает значение от 1 до 10 через эмодзи-шкалу (❄️→🔥). На экране отображается среднее значение с индикатором.",
    examples: ["Как оцениваете качество доклада?", "Насколько вы уверены в принятом решении?", "Насколько тема актуальна для вас?"],
    settings: ["Таймер", "Лимит голосов", "Разрешить переголосовать"],
  },
  {
    icon: "👍",
    name: "Лайк / Дизлайк",
    when: "Для быстрой бинарной реакции: да или нет, нравится или нет.",
    how: "Участник нажимает 👍 или 👎. На экране видно соотношение в процентах.",
    examples: ["Согласны с таким решением?", "Выпускаем релиз на этой неделе?", "Оставляем эту функцию в продукте?"],
    settings: ["Таймер", "Лимит голосов", "Разрешить переголосовать"],
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
    when: "Для сессии вопросов и ответов: участники анонимно пишут вопросы, ведущий модерирует и выносит нужные на экран.",
    how: "Участники отправляют вопросы в любой момент. Вопросы попадают в панель ведущего, который решает что показать, что отметить как отвеченное, а что скрыть. AI может выделить ключевые темы одной кнопкой.",
    examples: ["Открытая Q&A после доклада", "Анонимные вопросы на тренинге", "Сбор тем для следующей встречи"],
    settings: ["Нет таймера: Q&A живёт весь сеанс", "До N вопросов от одного участника (1–10)", "AI-анализ по кнопке"],
  },
  {
    icon: "💡",
    name: "Стена идей",
    when: "Когда нужно собрать идеи, предложения или мнения от всего зала и сразу показать их на экране — без фильтрации. Идеально для брейнштормов, ретроспектив и сессий обратной связи.",
    how: "Участник вводит свою идею (до 200 символов) и отправляет. Идеи немедленно появляются на дисплейном экране в виде цветных карточек — без модерации. Карточки упорядочены по популярности. Ведущий может скрыть неподходящие через панель идей.",
    examples: ["Что улучшить в нашем продукте?", "Идеи для следующего спринта", "Ваш главный вывод после этой встречи", "Что бы вы изменили в команде?"],
    settings: ["Нет таймера: идеи принимаются весь сеанс", "Одна идея от участника", "Ведущий может скрыть неподходящие", "AI-анализ в панели идей"],
  },
];

export default function PollTypesPage() {
  return (
    <div className="max-w-prose">
      <Link href="/help" className="py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        ← Помощь
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Типы опросов</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Восемь форматов — под любой сценарий выступления.
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

      <div className="mt-10 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">🎯 Квиз-режим</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Доступен для типа <b>Множественный выбор</b>. При создании опроса включите переключатель
          «Квиз-режим», выберите правильный ответ из списка вариантов и при желании добавьте
          короткое пояснение (до 200 символов).
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Пока опрос идёт, правильный ответ скрыт — участники не могут его угадать заранее.
          Когда ведущий закрывает опрос, на дисплейном экране правильный бар подсвечивается
          зелёным, остальные — серыми. Участник на своём телефоне видит <b>«Правильно! 🎉»</b> или
          <b>«Неправильно 😔»</b> вместе с правильным ответом и пояснением.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">✏️ Редактирование опроса</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          В течение <b>10 минут</b> после создания опроса рядом с ним появляется кнопка ✏️.
          Можно исправить формулировку вопроса и варианты ответов. Изменение сразу отображается
          на всех экранах. По истечении 10 минут кнопка скрывается — это ограничение защищает
          от редактирования уже после получения результатов.
        </p>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/getting-started" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Быстрый старт
        </Link>
        <Link href="/help/display-screen" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          Дисплейный экран →
        </Link>
      </div>
    </div>
  );
}
