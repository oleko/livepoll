import Link from "next/link";
import { getLocale } from "next-intl/server";

export const metadata = { title: "Slides & screens" };

const SCREENS = [
  {
    icon: "🎯",
    name: "Заставка",
    when: "Открывает мероприятие или заполняет экран во время перерыва. Видна аудитории пока ведущий готовится к следующему блоку.",
    fields: ["Название мероприятия", "Подзаголовок / тема", "Дата", "Место проведения"],
    example: "«DevConf 2026» · «Технологии меняют мир» · 15–16 мая · Москва",
  },
  {
    icon: "🎤",
    name: "Спикер",
    when: "Представляет докладчика перед его выступлением. Показывает имя, роль и тему доклада крупно на весь экран.",
    fields: ["Имя докладчика", "Должность и компания", "Тема доклада", "URL фото (необязательно)"],
    example: "Иван Иванов · CTO · Яндекс · «Масштабирование Алисы до 100М пользователей»",
  },
  {
    icon: "🗓",
    name: "Расписание",
    when: "Показывает план дня целиком. Активный блок подсвечивается — аудитория видит, что идёт сейчас и что будет дальше.",
    fields: ["Список пунктов: время + название", "Отметка текущего пункта (кнопка ▶)"],
    example: "10:00 Открытие · 10:30 ▶ Иван Иванов · 12:00 Обед · 13:00 Мария Петрова",
  },
  {
    icon: "💬",
    name: "Цитата",
    when: "Крупный текст на весь экран. Подходит для тезисов между докладами, вдохновляющих фраз или ключевых идей дня.",
    fields: ["Текст цитаты", "Автор (необязательно)"],
    example: "«Любая достаточно продвинутая технология неотличима от магии» — Артур Кларк",
  },
  {
    icon: "❓",
    name: "Вопрос-ответ",
    when: "Ведущий задаёт вопрос залу вслух, аудитория думает — затем одним нажатием ведущий открывает правильный ответ прямо на экране. Если включена кнопка «Я знаю!», участники могут нажать её на своём телефоне: первые пять нажавших появятся на дисплее.",
    fields: ["Вопрос для аудитории", "Правильный ответ", "Кнопка «Я знаю!» для участников (необязательно)"],
    example: "«Сколько строк кода в ядре Linux?» → ответ открывается кнопкой «Ответ» в панели ведущего",
  },
  {
    icon: "🎡",
    name: "Колесо фортуны",
    when: "Случайный выбор победителя розыгрыша или следующего докладчика. После нажатия «Показать» аудитория видит список всех вариантов. Ведущий нажимает «🎡 Запустить» — на экране идёт обратный отсчёт 3-2-1, затем анимация слот-машины останавливается на победителе.",
    fields: ["Заголовок (необязательно)", "Список вариантов (каждый с новой строки)"],
    example: "Список участников конкурса: Анна, Иван, Мария, Пётр → показываем варианты → нажимаем «Запустить» → 3-2-1 → победитель",
  },
  {
    icon: "📣",
    name: "Объявление",
    when: "Важное сообщение поверх любого контента. Можно добавить таймер обратного отсчёта — удобно для перерывов и технических пауз.",
    fields: ["Текст объявления", "Таймер: без таймера / 15 с / 30 с / 1 мин / 2 мин / 5 мин"],
    example: "«Перерыв на кофе» + таймер 15 минут — число отсчитывается на весь экран",
  },
  {
    icon: "🎉",
    name: "Финальный экран",
    when: "Завершает мероприятие. Благодарит участников и даёт ссылку на материалы, записи или анкету обратной связи.",
    fields: ["Заголовок", "Подзаголовок", "Ссылка на материалы"],
    example: "«Спасибо за участие!» · conf.example.com/2026",
  },
];

export default async function SlidesPage() {
  const locale = await getLocale();
  const isEn = locale === "en";
  return (
    <div className="max-w-prose">
      <Link href="/help" className="py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        {isEn ? "← Help" : "← Помощь"}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{isEn ? "Slides & screens" : "Экраны и презентация"}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        {isEn ? "Control what your audience sees on the projector — title cards, speakers, schedule, Q&A, spin wheel, and announcements." : "Управляйте тем, что видит аудитория на проекторе — заставки, спикеры, расписание, вопросы-ответы, колесо фортуны и объявления."}
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как это работает</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            В панели мероприятия слева — единый <b>лайн-ап</b>: все опросы и экраны в одном списке.
            Карточки экранов выделены фиолетовым акцентом. Справа — форма для создания новых
            опросов и экранов.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Нажмите <b>«Показать»</b> рядом с нужным экраном — он мгновенно появится на проекторе,
            перекрыв всё остальное. Нажмите <b>«Убрать»</b> — дисплей вернётся к стандартному виду
            (QR-код или результаты опроса). Объявления отображаются поверх экрана.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Создание экрана</h2>
          <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-3">
              <span className="font-semibold text-slate-900 dark:text-white shrink-0">1.</span>
              В правой колонке нажмите <b>«Добавить экран»</b>.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-slate-900 dark:text-white shrink-0">2.</span>
              Выберите тип из восьми вариантов.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-slate-900 dark:text-white shrink-0">3.</span>
              Заполните поля и нажмите <b>«Создать»</b>. Экран появится в лайн-апе.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-slate-900 dark:text-white shrink-0">4.</span>
              Нажмите <b>«Показать»</b> в карточке — экран выйдет на проектор.
            </li>
          </ol>
          <div className="mt-4 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
            💡 Подготовьте все экраны заранее — во время мероприятия достаточно одного клика чтобы переключиться между заставкой, спикером и расписанием.
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Управление порядком</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Перетащите карточку экрана за значок <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">⠿</span> чтобы изменить порядок в лайн-апе.
            Порядок сохраняется и виден при следующем открытии страницы.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Предпросмотр и дублирование</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            На каждой карточке слайда в лайн-апе есть две вспомогательные кнопки:
          </p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-2.5">
              <span className="text-purple-500 shrink-0 mt-0.5">👁</span>
              <span><b>Предпросмотр</b> — открывает модальное окно с реальным рендером слайда в масштабе 1:3. Показывает точно то, что увидит аудитория на проекторе, без переключения на дисплейный экран.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-purple-500 shrink-0 mt-0.5">⎘</span>
              <span><b>Дублировать</b> — создаёт полную копию слайда в конце лайн-апа. Удобно для похожих карточек спикеров или расписаний в разные дни.</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Восемь типов экранов</h2>
          <div className="space-y-4">
            {SCREENS.map(s => (
              <div key={s.name} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-2xl">{s.icon}</span>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{s.name}</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{s.when}</p>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Поля</p>
                    <ul className="space-y-0.5">
                      {s.fields.map(f => (
                        <li key={f} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <span className="text-purple-400 shrink-0">—</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Пример</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">{s.example}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Сценарий конференции</h2>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {[
              { icon: "🎯", text: "До начала — Заставка с названием конференции. Люди заходят, видят бренд." },
              { icon: "🗓", text: "Открытие — Расписание дня. Аудитория понимает структуру." },
              { icon: "🎤", text: "Перед каждым докладом — Спикер. Карточка с именем, ролью и темой." },
              { icon: "📊", text: "Во время доклада — запустите опрос. Живые результаты прямо в теме. Нажмите «Итог» чтобы заморозить финальный результат на экране." },
              { icon: "❓", text: "Интерактивная пауза — Вопрос-ответ. Задайте вопрос залу, откройте ответ кнопкой." },
              { icon: "💬", text: "Между блоками — Цитата или тезис. Заполняет паузу контентом." },
              { icon: "🎉", text: "Финал — Завершающий экран со ссылкой на материалы и контакты." },
            ].map(item => (
              <div key={item.text} className="flex gap-3">
                <span className="shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/display-screen" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Дисплейный экран
        </Link>
        <Link href="/help/qa-and-ai" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          Q&A и AI-анализ →
        </Link>
      </div>
    </div>
  );
}
