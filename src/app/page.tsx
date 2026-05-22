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

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <span className="text-lg font-bold tracking-tight">LivePoll AI</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/auth/login" className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2">
            Войти
          </Link>
          <Link href="/auth/register" className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors">
            Начать бесплатно
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-10 pt-20 pb-16">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-600 dark:text-indigo-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Powered by YandexGPT
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
            Аудитория говорит.
            <br />
            <span className="text-indigo-600 dark:text-indigo-400">Вы слышите каждого.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Участники голосуют со смартфона — без приложений и регистрации.
            Результаты появляются на экране докладчика мгновенно.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register" className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-8 py-3.5 text-base font-semibold text-white transition-colors shadow-lg shadow-indigo-600/20">
              Создать первый опрос
            </Link>
            <Link href="/auth/login" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-8 py-3.5 text-base font-semibold transition-colors">
              Войти в аккаунт
            </Link>
          </div>
        </div>

        {/* Split-screen hero visual */}
        <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50">
          {/* Browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
            <span className="h-3 w-3 rounded-full bg-red-400/60" />
            <span className="h-3 w-3 rounded-full bg-amber-400/60" />
            <span className="h-3 w-3 rounded-full bg-green-400/60" />
            <span className="mx-auto text-xs text-slate-400 dark:text-slate-600 font-mono">livepoll.ai/display/CONF24</span>
          </div>

          <div className="flex flex-col md:flex-row min-h-[320px]">
            {/* Display screen mock */}
            <div className="flex-1 p-6 md:p-8 bg-slate-900 dark:bg-slate-950">
              <div className="flex items-center justify-between mb-6">
                <span className="text-slate-400 text-xs">DevConf 2025</span>
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-bold font-mono tabular-nums">1:24</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>
              {/* Timer bar */}
              <div className="h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: "68%" }} />
              </div>
              <p className="text-white text-xs uppercase tracking-widest mb-3 text-slate-500">Множественный выбор</p>
              <h3 className="text-white text-xl font-bold mb-6">Какую тему разобрать подробнее?</h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Архитектура микросервисов", pct: 52 },
                  { label: "CI/CD на практике", pct: 28 },
                  { label: "Observability и мониторинг", pct: 14 },
                  { label: "Безопасность API", pct: 6 },
                ].map((opt) => (
                  <div key={opt.label} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-44 shrink-0 truncate">{opt.label}</span>
                    <div className="flex-1 h-6 rounded-md bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-md bg-indigo-600 flex items-center pl-2 transition-all" style={{ width: `${opt.pct}%` }}>
                        <span className="text-xs font-bold text-white">{opt.pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-slate-600 text-xs mt-4">84 голоса</p>
            </div>

            {/* Mobile mock */}
            <div className="md:w-72 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-8 gap-5">
              <p className="text-xs text-slate-400 text-center">Так видит участник на телефоне</p>
              <div className="w-full max-w-[200px] flex flex-col gap-2">
                {["Архитектура микросервисов", "CI/CD на практике", "Observability", "Безопасность API"].map((opt) => (
                  <div key={opt} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-center hover:border-indigo-400 cursor-pointer transition-colors">
                    {opt}
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-1 mt-2">
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 grid grid-cols-5 gap-0.5 p-1">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className={`rounded-sm ${[0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24].includes(i) ? "bg-slate-600 dark:bg-slate-400" : ""}`} />
                  ))}
                </div>
                <span className="font-mono text-slate-900 dark:text-white text-sm font-bold tracking-widest">CONF24</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats strip ─── */}
      <section className="border-y border-slate-100 dark:border-slate-800/60 py-8 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: "7", label: "типов опросов" },
              { value: "0", label: "установок для участников" },
              { value: "< 1с", label: "задержка результатов" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{s.value}</p>
                <p className="text-xs md:text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Use cases ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-10 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Подходит для любого формата</h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-14 max-w-xl mx-auto">От быстрого опроса на митинге до полноценной Q&A-сессии на конференции</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "🎤",
              title: "Конференции и митапы",
              desc: "Держи аудиторию вовлечённой. Голосования, Q&A, температура зала — всё в одном месте. Никто не засыпает.",
              tags: ["Облако слов", "Q&A", "Шкала температуры"],
            },
            {
              icon: "🔄",
              title: "Agile-команды",
              desc: "Planning Poker без таблиц и споров. Оцениваете задачи вместе, видите разброс мнений сразу — принимаете решение быстрее.",
              tags: ["Planning Poker", "Лайк/Дизлайк"],
            },
            {
              icon: "🎓",
              title: "Обучение и тренинги",
              desc: "Проверяй понимание материала прямо на лекции. Результаты — мгновенно на доске. Никаких тестов после занятия.",
              tags: ["Множественный выбор", "Облако эмодзи"],
            },
          ].map((uc) => (
            <div key={uc.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="text-4xl mb-5">{uc.icon}</div>
              <h3 className="text-lg font-semibold mb-3">{uc.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">{uc.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {uc.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs text-slate-500 dark:text-slate-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── AI block ─── */}
      <section className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 py-24">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-600 dark:text-indigo-300 mb-6">
                ✨ Powered by YandexGPT
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                AI берёт<br />модерацию на себя
              </h2>
              <div className="flex flex-col gap-6">
                <div className="flex gap-4">
                  <div className="text-2xl shrink-0">📩</div>
                  <div>
                    <p className="font-semibold mb-1">Q&A без хаоса</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">200 вопросов из зала? ИИ выделяет 3 главные темы за секунды. Вы отвечаете по делу, а не тонете в потоке.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-2xl shrink-0">📺</div>
                  <div>
                    <p className="font-semibold mb-1">Ведущий — главный</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Вопросы не появляются на экране автоматически. Вы выбираете, что показать — одной кнопкой. Полный контроль над залом.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-2xl shrink-0">▲</div>
                  <div>
                    <p className="font-semibold mb-1">Аудитория сортирует сама</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Участники голосуют за чужие вопросы. Самые важные всплывают наверх — вы сразу видите, что волнует зал больше всего.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QAPanel mock */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl shadow-slate-100 dark:shadow-slate-950/50">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Q&A <span className="text-slate-400 font-normal">(12)</span></span>
                <span className="rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">✨ AI-анализ</span>
              </div>
              {/* AI summary mock */}
              <div className="mx-4 mt-4 rounded-lg bg-indigo-600/10 border border-indigo-600/20 p-3 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">✨ AI</p>
                <p className="leading-relaxed">1. <b>Масштабирование</b> — большинство спрашивает про горизонтальное масштабирование и базы данных.<br />2. <b>Безопасность</b> — вопросы про аутентификацию и защиту API.<br />3. <b>Тестирование</b> — как тестировать микросервисы в изоляции.</p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {[
                  { text: "Как вы решаете проблему согласованности данных между сервисами?", upvotes: 14, pinned: true },
                  { text: "Какой подход к логированию используете в продакшне?", upvotes: 9, pinned: false },
                  { text: "Есть ли смысл переходить на микросервисы если команда меньше 10 человек?", upvotes: 7, pinned: false },
                ].map((q) => (
                  <div key={q.text} className={`rounded-lg border p-3 flex items-start gap-2 ${q.pinned ? "border-indigo-500/30 bg-indigo-500/5" : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"}`}>
                    <p className="flex-1 text-xs text-slate-700 dark:text-slate-300 leading-snug">{q.text}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-indigo-500 font-semibold">▲ {q.upvotes}</span>
                      {q.pinned && <span className="text-xs">📺</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Poll types ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-10 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">7 форматов голосований</h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-14">Под любой сценарий — от настроения зала до командного планирования</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "📊", name: "Множественный выбор", desc: "Классический опрос с вариантами и живой гистограммой" },
            { icon: "🌡️", name: "Шкала температуры", desc: "Проверь настроение аудитории от ❄️ до 🔥" },
            { icon: "👍", name: "Лайк / Дизлайк", desc: "Быстрая оценка идеи или предложения" },
            { icon: "☁️", name: "Облако слов", desc: "Свободные ответы — популярные слова крупнее" },
            { icon: "😊", name: "Облако эмодзи", desc: "Эмоциональная реакция зала одним нажатием" },
            { icon: "🃏", name: "Planning Poker", desc: "Оценка задач в спринте без давления авторитетов" },
            { icon: "❓", name: "Q&A", desc: "Вопросы от аудитории с модерацией и AI-анализом" },
            { icon: "✨", name: "Скоро", desc: "Новые форматы в разработке" },
          ].map((t) => (
            <div key={t.name} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-white dark:hover:bg-slate-800/50 transition-colors group">
              <div className="text-3xl mb-3">{t.icon}</div>
              <p className="text-sm font-semibold mb-1 text-slate-900 dark:text-white">{t.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <h2 className="text-3xl font-bold text-center mb-14">Как это работает</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                icon: "🛠️",
                title: "Создайте мероприятие",
                desc: "Добавьте опросы нужных типов, задайте таймер или лимит голосов. Получите QR-код и ссылку для участников.",
              },
              {
                step: "02",
                icon: "📱",
                title: "Участники сканируют QR",
                desc: "Никаких приложений и регистраций. Открывается браузер — и сразу интерфейс голосования. Телефон — достаточно.",
              },
              {
                step: "03",
                icon: "📡",
                title: "Управляйте залом в реальном времени",
                desc: "Запускайте опросы, выводите вопросы на экран, смотрите результаты. Всё синхронизируется мгновенно.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-bold text-slate-100 dark:text-slate-800 mb-3 leading-none">{item.step}</div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="mx-auto max-w-5xl px-6 md:px-10 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Тарифы</h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-14">Начните бесплатно, масштабируйте по мере роста</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Бесплатный",
              price: "0 ₽",
              period: "навсегда",
              desc: "Для старта и небольших мероприятий",
              features: ["До 30 участников", "3 опроса на сессию", "Все 7 типов голосований", "QR-код и display-экран"],
              cta: "Начать бесплатно",
              href: "/auth/register",
              highlight: false,
            },
            {
              name: "Pro",
              price: "990 ₽",
              period: "в месяц",
              desc: "Для регулярных мероприятий и больших аудиторий",
              features: ["До 500 участников", "Безлимит опросов", "✨ AI-анализ Q&A", "Таймер и лимит голосов", "Телепромптер"],
              cta: "Попробовать Pro",
              href: "/auth/register",
              highlight: true,
            },
            {
              name: "Team",
              price: "2 490 ₽",
              period: "в месяц",
              desc: "Для команд и корпоративных мероприятий",
              features: ["Безлимит участников", "Командный доступ", "Все функции Pro", "Приоритетная поддержка"],
              cta: "Связаться с нами",
              href: "/auth/register",
              highlight: false,
            },
          ].map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-7 flex flex-col ${plan.highlight ? "border-indigo-500 bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
              <p className={`text-sm font-semibold mb-1 ${plan.highlight ? "text-indigo-200" : "text-slate-500 dark:text-slate-400"}`}>{plan.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className={`text-sm mb-1 ${plan.highlight ? "text-indigo-200" : "text-slate-400"}`}>{plan.period}</span>
              </div>
              <p className={`text-sm mb-6 ${plan.highlight ? "text-indigo-200" : "text-slate-500 dark:text-slate-400"}`}>{plan.desc}</p>
              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-indigo-100" : "text-slate-600 dark:text-slate-300"}`}>
                    <span className={`mt-0.5 shrink-0 ${plan.highlight ? "text-indigo-200" : "text-indigo-500"}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className={`rounded-xl py-2.5 text-sm font-semibold text-center transition-colors ${plan.highlight ? "bg-white text-indigo-600 hover:bg-indigo-50" : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="mx-auto max-w-4xl px-6 md:px-10 pb-24">
        <div className="rounded-3xl bg-indigo-600 p-12 md:p-16 text-center text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Следующее выступление —<br />с живой аудиторией.
            </h2>
            <p className="text-indigo-200 mb-10 text-lg">Создайте аккаунт за 2 минуты и проведите первое голосование уже сегодня.</p>
            <Link href="/auth/register" className="inline-block rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 px-10 py-4 text-base font-bold transition-colors shadow-lg">
              Начать бесплатно
            </Link>
            <p className="text-indigo-300 text-sm mt-4">Без кредитной карты</p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 px-6 md:px-10 py-8">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-slate-900 dark:text-white">LivePoll AI</span>
          <p className="text-xs text-slate-400 dark:text-slate-600">© 2025 LivePoll AI. Все права защищены.</p>
          <div className="flex gap-6 text-xs text-slate-400 dark:text-slate-600">
            <Link href="/help" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors">Помощь</Link>
            <Link href="/docs/privacy" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors">Политика конфиденциальности</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
