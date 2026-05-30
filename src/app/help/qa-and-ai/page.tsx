import Link from "next/link";

export const metadata = { title: "Q&A и AI-анализ" };

export default function QaAndAiPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/help" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        ← Помощь
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Q&A и AI-анализ</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Вопросы из зала с модерацией и автоматическим выделением главных тем.
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как добавить Q&A в мероприятие</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            В форме создания опроса выберите тип <b>Q&A</b>. Дайте ему понятное название,
            например «Вопросы к докладчику», и нажмите «Создать». Q&A-опрос не нужно отдельно
            запускать и закрывать — он живёт в течение всего мероприятия, пока оно активно.
          </p>
          <Tip>
            Добавьте Q&A в самом начале, чтобы участники могли отправлять вопросы
            прямо во время вашего доклада.
          </Tip>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как участники задают вопросы</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            На странице участника появляется форма Q&A. Участник пишет вопрос и нажимает
            «Задать вопрос». Вопрос сразу появляется в панели ведущего. Вопросы анонимны —
            ведущий не видит, кто их отправил.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            Ограничение: не более 300 символов на один вопрос.
          </p>
          <Tip>
            По умолчанию каждый участник может задать <b>1 вопрос</b>. В настройках Q&A-опроса
            можно разрешить до 10 вопросов от одного человека — удобно для длинных сессий.
          </Tip>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Модерация</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            Вопросы не появляются на дисплейном экране автоматически — вы полностью контролируете,
            что видит зал. Для каждого вопроса доступны четыре действия:
          </p>
          <div className="space-y-3">
            <Action
              label="Вынести на экран"
              icon="📺"
              desc="Выбранный вопрос появится на дисплейном экране крупно в правой панели. Одновременно виден только один вопрос — предыдущий убирается."
            />
            <Action
              label="Отметить как отвеченный"
              icon="✓"
              desc="Вопрос визуально отмечается как разобранный. Удобно вести порядок и не забыть, что уже обсудили."
            />
            <Action
              label="Скрыть"
              icon="🚫"
              desc="Вопрос пропадает из активного списка. Используйте для нерелевантных или неуместных вопросов. Скрытые вопросы можно восстановить."
            />
            <Action
              label="Удалить"
              icon="✕"
              desc="Вопрос безвозвратно удаляется. Используйте для явно нежелательного контента."
            />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">AI-анализ вопросов</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            Если вопросов накопилось много, одна кнопка <b>«✨ AI-анализ»</b> в панели Q&A запускает
            автоматический анализ. Используется YandexGPT.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            AI читает все вопросы и выделяет <b>три главные темы</b> — с коротким названием
            и пояснением, что именно волнует аудиторию. Это помогает за секунды понять,
            о чём спрашивают 100+ человек, и выбрать, с чего начать ответы.
          </p>
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 p-4">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Пример результата AI-анализа</p>
            <ol className="space-y-1.5 text-sm text-indigo-900 dark:text-indigo-200">
              <li><b>1. Масштабирование</b> — большинство спрашивает про горизонтальное масштабирование и управление нагрузкой.</li>
              <li><b>2. Безопасность API</b> — вопросы про аутентификацию, токены и защиту от атак.</li>
              <li><b>3. Тестирование</b> — как тестировать микросервисы в изоляции без хрупких интеграционных тестов.</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">AI-прощание при завершении</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Когда ведущий завершает мероприятие, AI автоматически генерирует короткое тёплое
            прощальное сообщение для участников — 1–2 предложения. Оно отображается на экране
            каждого участника вместо стандартной заглушки. Генерация занимает секунду и не
            требует никаких действий от ведущего.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/display-screen" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Дисплейный экран
        </Link>
        <Link href="/help/plans" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Тарифы и лимиты →
        </Link>
      </div>
    </div>
  );
}

function Action({ label, icon, desc }: { label: string; icon: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <span className="text-xl shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
      </div>
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
