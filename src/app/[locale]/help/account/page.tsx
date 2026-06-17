import Link from "next/link";
import { getLocale } from "next-intl/server";

export const metadata = { title: "Account | LivePoll AI" };

export default async function AccountHelpPage() {
  const locale = await getLocale();
  const isEn = locale === "en";
  return (
    <div className="max-w-prose">
      <Link href="/help" className="py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        {isEn ? "← Help" : "← Помощь"}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{isEn ? "Account" : "Аккаунт"}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        {isEn ? "Manage your profile, change password, and delete your account." : "Управление профилем, смена пароля и удаление аккаунта."}
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Как открыть настройки аккаунта</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            В шапке любой страницы личного кабинета нажмите <b>«Аккаунт»</b> — откроется страница{" "}
            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">/account</code>.
            Там четыре раздела: профиль, смена email, смена пароля и удаление аккаунта.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Изменить имя</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            В разделе <b>«Профиль»</b> измените поле «Имя» и нажмите «Сохранить».
            Имя отображается в панели администратора и в настройках организации.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Изменить email</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
            В разделе <b>«Смена email»</b> введите новый адрес и нажмите «Отправить подтверждение».
            На новый адрес придёт письмо со ссылкой — нужно перейти по ней, после чего email обновится.
          </p>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            ⚠ Пока вы не перешли по ссылке в письме, вход выполняется по старому email.
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Изменить пароль</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            В разделе <b>«Смена пароля»</b> введите текущий пароль, затем новый (минимум 8 символов) и
            подтверждение. Нажмите «Изменить пароль» — изменение применяется сразу.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Если вы зарегистрировались через Яндекс, этот раздел не отображается —
            управление паролем доступно в настройках Яндекс ID.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Удалить аккаунт</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            Раздел <b>«Удаление аккаунта»</b> находится внизу страницы.
            Нажмите «Удалить аккаунт», введите слово <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">удалить</code> и подтвердите.
          </p>
          <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
            ⛔ Удаление необратимо: аккаунт, все мероприятия, опросы и данные участников
            уничтожаются без возможности восстановления.
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Часто задаваемые вопросы</h2>
          <div className="space-y-4">
            {[
              {
                q: "Я не помню пароль — как войти?",
                a: "На странице входа нажмите «Войти через Яндекс» (если регистрировались через Яндекс) или воспользуйтесь функцией сброса пароля — напишите нам на oleko85@gmail.com, и мы сбросим пароль вручную.",
              },
              {
                q: "Можно ли сменить email без доступа к старому ящику?",
                a: "Нет: подтверждение отправляется на новый адрес, но ссылка действительна только пока вы авторизованы текущей сессией. Если потеряли доступ к аккаунту — напишите нам.",
              },
              {
                q: "Что происходит с мероприятиями после удаления аккаунта?",
                a: "Все мероприятия, опросы, голоса и данные участников удаляются. Если вы хотите сохранить результаты — экспортируйте их (CSV/PDF) до удаления.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">{q}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/team" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Команда
        </Link>
        <Link href="/help/changelog" className="py-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          История обновлений →
        </Link>
      </div>
    </div>
  );
}
