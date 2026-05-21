import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("organization_members")
      .select("organizations(slug)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const org = member?.organizations as { slug: string } | null;
    if (org?.slug) redirect(`/org/${org.slug}`);
    else redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-200/50 dark:border-slate-800/50">
        <span className="text-lg font-bold tracking-tight">LivePoll AI</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/auth/login"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2"
          >
            Войти
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Начать бесплатно
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-600 dark:text-indigo-300 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
          Работает в реальном времени
        </div>

        <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Живые голосования
          <br />
          <span className="text-indigo-600 dark:text-indigo-400">для ваших мероприятий</span>
        </h1>

        <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Участники голосуют со смартфона без установки приложений.
          Результаты обновляются мгновенно на экране докладчика.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/register"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-8 py-3.5 text-base font-semibold text-white transition-colors"
          >
            Попробовать бесплатно
          </Link>
          <Link
            href="/auth/login"
            className="rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-8 py-3.5 text-base font-semibold transition-colors"
          >
            Войти в аккаунт
          </Link>
        </div>
      </section>

      {/* Demo preview */}
      <section className="mx-auto max-w-5xl px-8 pb-24">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden">
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80">
            <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="mx-auto text-xs text-slate-400 dark:text-slate-600 font-mono">livepoll.ru/display/ABC123</span>
          </div>
          {/* Fake display screen */}
          <div className="p-8 flex gap-6 min-h-[280px]">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-6">
                <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
                  LIVE
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">47 голосов</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Насколько вы довольны мероприятием?</h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Очень доволен", pct: 58 },
                  { label: "Доволен", pct: 28 },
                  { label: "Нейтрально", pct: 10 },
                  { label: "Не доволен", pct: 4 },
                ].map((opt) => (
                  <div key={opt.label} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400 w-32 shrink-0">{opt.label}</span>
                    <div className="flex-1 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-indigo-600 flex items-center pl-3 transition-all"
                        style={{ width: `${opt.pct}%` }}
                      >
                        <span className="text-xs font-bold text-white">{opt.pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* QR mock */}
            <div className="w-36 flex flex-col items-center justify-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-6">
              <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-800 grid grid-cols-5 gap-0.5 p-1.5">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-sm ${[0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,6,12,18].includes(i) ? "bg-slate-600 dark:bg-slate-400" : "bg-slate-200 dark:bg-slate-800"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500 text-center">Сканируйте<br/>для участия</span>
              <span className="font-mono text-slate-900 dark:text-white text-sm font-bold">ABC123</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-8 pb-24">
        <h2 className="text-2xl font-bold text-center mb-12">Как это работает</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Создайте мероприятие",
              desc: "Добавьте опросы нужных типов. Получите QR-код и ссылку для участников.",
            },
            {
              step: "02",
              title: "Участники сканируют QR",
              desc: "Никаких приложений и регистраций. Телефон — достаточно.",
            },
            {
              step: "03",
              title: "Результаты в реальном времени",
              desc: "Голоса появляются на экране сразу. Запустите следующий опрос одной кнопкой.",
            },
          ].map((item) => (
            <div key={item.step} className="relative">
              <div className="text-5xl font-bold text-slate-200 dark:text-slate-800 mb-4">{item.step}</div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Poll types */}
      <section className="mx-auto max-w-5xl px-8 pb-24">
        <h2 className="text-2xl font-bold text-center mb-4">7 типов голосований</h2>
        <p className="text-center text-slate-500 text-sm mb-10">Под любой сценарий — от обратной связи до командного планирования</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "📊", name: "Множественный выбор", desc: "Классический опрос с вариантами" },
            { icon: "🌡️", name: "Шкала температуры", desc: "Настроение аудитории" },
            { icon: "👍", name: "Лайк / Дизлайк", desc: "Быстрая оценка" },
            { icon: "☁️", name: "Облако слов", desc: "Свободные ответы" },
            { icon: "😊", name: "Облако эмодзи", desc: "Эмоциональная реакция" },
            { icon: "🃏", name: "Planning Poker", desc: "Оценка задач в Agile" },
            { icon: "❓", name: "Q&A", desc: "Вопросы от аудитории" },
            { icon: "✨", name: "Скоро", desc: "Новые типы в разработке" },
          ].map((type) => (
            <div
              key={type.name}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="text-2xl mb-2">{type.icon}</div>
              <p className="text-sm font-medium">{type.name}</p>
              <p className="text-xs text-slate-500 mt-1">{type.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-8 pb-24 text-center">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-12">
          <h2 className="text-3xl font-bold mb-4">Готовы попробовать?</h2>
          <p className="text-slate-500 mb-8">Бесплатно. Без кредитной карты.</p>
          <Link
            href="/auth/register"
            className="inline-block rounded-xl bg-indigo-600 hover:bg-indigo-500 px-10 py-3.5 text-base font-semibold text-white transition-colors"
          >
            Создать аккаунт
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-800/50 px-8 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
        © 2025 LivePoll AI
      </footer>
    </div>
  );
}
