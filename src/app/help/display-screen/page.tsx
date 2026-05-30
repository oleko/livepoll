import Link from "next/link";

export const metadata = { title: "Дисплейный экран" };

export default function DisplayScreenPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/help" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        ← Помощь
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Дисплейный экран</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Отдельная страница для проектора или большого монитора — именно её видит ваша аудитория.
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Что это такое</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Дисплейный экран — это отдельная страница, которую вы открываете на втором мониторе
            или подключаете к проектору. Она автоматически показывает текущее состояние мероприятия
            в реальном времени: результаты опросов, вопросы из зала, или QR-код для подключения.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            Страница не скроллится и адаптируется под любое разрешение — от ноутбука до 4K-проектора.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как открыть</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            В активном мероприятии нажмите кнопку <b>«Экран»</b> в правом верхнем углу.
            Страница откроется в новой вкладке — перетащите её на второй монитор или
            включите полноэкранный режим клавишей <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs border border-slate-300 dark:border-slate-700">F11</kbd>.
          </p>
          <Tip>
            Откройте экран заранее — пока участники рассаживаются, они уже видят QR-код
            и могут подключаться без объявлений.
          </Tip>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Режимы экрана</h2>
          <div className="space-y-3">
            <Mode
              label="Ожидание"
              desc="Когда ни один опрос не запущен. На экране — крупный QR-код, код для ручного ввода и ссылка для подключения. Если задан счётчик присутствующих — показывается значок «🟢 N из M» под кодом."
            />
            <Mode
              label="Активный опрос"
              desc="Когда опрос запущен. На экране — вопрос и живые результаты, которые обновляются по мере поступления голосов. Показывается тип опроса, количество проголосовавших и, если задан таймер, обратный отсчёт. В шапке — бейдж LIVE."
            />
            <Mode
              label="Квиз — раскрытие ответа"
              desc="После закрытия опроса в квиз-режиме гистограмма остаётся на экране: правильный вариант подсвечивается зелёным, остальные — серым. Под графиком появляется плашка с правильным ответом и пояснением (если задано). Экран переходит к следующему опросу только когда ведущий его запускает."
            />
            <Mode
              label="Объявление"
              desc="Когда ведущий отправляет текстовое объявление из панели управления. Поверх всего контента появляется полноэкранный оверлей с текстом и, если задан таймер, обратным отсчётом. Исчезает по истечении времени или вручную."
            />
            <Mode
              label="Вопрос из зала (Q&A)"
              desc="Когда ведущий выносит вопрос на экран. Выбранный вопрос отображается крупно в правой панели — аудитория видит, что именно сейчас обсуждается."
            />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Пульс зала</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            На телефоне каждого участника есть кнопка 🔥 — нажав её, участник отправляет «огонёк».
            В шапке дисплейного экрана счётчик обновляется в реальном времени. Каждый огонёк
            живёт <b>10 секунд</b>, после чего гаснет. Это даёт живое ощущение вовлечённости зала.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Счётчик присутствующих</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            В шапке страницы мероприятия есть поле с числом участников. Введите количество людей
            в зале вручную (кнопками +/− или напрямую с клавиатуры) — на экране ожидания появится
            бейдж «🟢 подключилось N из M». Это помогает аудитории видеть, сколько людей уже
            вошли и ждут начала.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Объявления между опросами</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            В активном мероприятии в правой панели управления есть блок <b>«📢 Объявление»</b>.
            Введите текст — например, «Перерыв 10 минут» — выберите длительность таймера и
            нажмите «Объявить». Сообщение мгновенно появится на дисплейном экране и на
            телефонах всех участников в виде полноэкранного оверлея. Завершить объявление
            можно досрочно кнопкой «Завершить».
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Тема оформления</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Переключение между тёмной и светлой темой синхронизируется между всеми вкладками браузера.
            QR-код на экране автоматически меняет цвета фона и переднего плана в зависимости от темы.
          </p>
          <Tip>
            Тёмный фон хорошо смотрится на большинстве проекторов — меньше засвет, выше контраст.
          </Tip>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Практические советы</h2>
          <ul className="space-y-2.5">
            {[
              "Для стабильной работы убедитесь, что есть надёжный Wi-Fi или мобильный интернет.",
              "Если браузер перешёл в спящий режим — обновите страницу: она восстановит состояние мгновенно.",
              "Участники могут набрать ДОМЕН/КОД прямо в адресной строке без /join/ — получат тот же экран голосования.",
              "Можно использовать экран без второго монитора: просто оставьте вкладку открытой и переключайтесь между ней и панелью управления.",
            ].map((tip) => (
              <li key={tip} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/poll-types" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Типы опросов
        </Link>
        <Link href="/help/qa-and-ai" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Q&A и AI-анализ →
        </Link>
      </div>
    </div>
  );
}

function Mode({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{label}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
      💡 {children}
    </div>
  );
}
