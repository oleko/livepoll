import Link from "next/link";
import { getLocale } from "next-intl/server";

export const metadata = { title: "For participants" };

export default async function ParticipantsPage() {
  const locale = await getLocale();
  const isEn = locale === "en";
  return (
    <div className="max-w-prose">
      <Link href="/help" className="py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        {isEn ? "← Help" : "← Помощь"}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{isEn ? "For participants" : "Для участников"}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        {isEn ? "How to join a poll — no registration, no apps." : "Как подключиться к голосованию — без регистрации и без приложений."}
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Что вам понадобится</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Только смартфон или планшет с браузером. Никакого приложения, никакой регистрации,
            никакого аккаунта. Вы нажимаете ссылку — и сразу оказываетесь в интерфейсе голосования.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Три способа подключиться</h2>
          <div className="space-y-4">
            <Way n="1" title="QR-код">
              Наведите камеру смартфона на QR-код с экрана докладчика. На большинстве устройств
              появится всплывающая ссылка — нажмите её. Если камера не реагирует, воспользуйтесь
              любым QR-сканером из магазина приложений.
            </Way>
            <Way n="2" title="Прямая ссылка">
              Ведущий может поделиться ссылкой через Telegram, VK, Max или почту.
              Нажмите на ссылку — она откроется сразу в браузере.
            </Way>
            <Way n="3" title="Код вручную">
              Если есть только короткий код (например, <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">CONF24</code>),
              введите адрес сайта в браузере и укажите этот код в поле «Код мероприятия».
            </Way>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как голосовать</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            Когда ведущий запускает опрос, он появляется у вас на экране автоматически —
            страницу обновлять не нужно. Выберите ответ и нажмите кнопку.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Проголосовать можно только один раз. Если опрос закрыт, вы увидите сообщение об этом
            и будете ждать следующего.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Q&A: как задать вопрос</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            Если ведущий включил сессию вопросов и ответов, вы увидите вкладку Q&A.
            Напишите вопрос в поле и нажмите <b>«Отправить»</b>.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Под чужими вопросами есть кнопка <b>▲</b> — нажмите её, если хотите поддержать
            чей-то вопрос. Вопросы с большим числом голосов поднимаются выше и с большей
            вероятностью попадут на экран.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Анонимность</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Ваши ответы и вопросы привязаны к анонимному идентификатору браузера —
            имя и личные данные не собираются. Ведущий видит только статистику голосов и тексты вопросов.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/poll-types" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          Типы опросов →
        </Link>
        <Link href="/help/qa-and-ai" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          Q&A и AI-анализ →
        </Link>
      </div>
    </div>
  );
}

function Way({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{title}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
