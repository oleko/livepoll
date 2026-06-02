import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { InViewSection } from "@/components/InViewSection";
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
      <section className="relative overflow-hidden pt-24 pb-28">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="animate-blob absolute -top-32 -left-20 h-[500px] w-[500px] bg-indigo-500/20 dark:bg-indigo-600/15 blur-3xl" />
          <div className="animate-blob-slow blob-delay-2 absolute top-10 right-0 h-[420px] w-[420px] bg-purple-500/15 dark:bg-purple-600/10 blur-3xl" />
          <div className="animate-blob blob-delay-4 absolute -bottom-20 left-1/3 h-[380px] w-[380px] bg-cyan-500/10 dark:bg-cyan-600/8 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 md:px-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-600 dark:text-indigo-300 mb-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Powered by YandexGPT
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] tracking-tight animate-fade-in" style={{ animationDelay: "200ms" }}>
            Аудитория говорит.
            <br />
            <span className="text-indigo-600 dark:text-indigo-400">Вы слышите каждого.</span>
          </h1>
          <p className="mt-7 text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "350ms" }}>
            Голосования, слайды для проектора и AI-анализ — полный инструмент ведущего в одном месте.
            Участники подключаются по QR-коду без приложений и регистрации.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: "500ms" }}>
            <Link href="/auth/register" className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] px-8 py-3.5 text-base font-semibold text-white transition-[background-color,transform,box-shadow] duration-150 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 hover:shadow-xl">
              Создать первый опрос
            </Link>
            <Link href="/auth/login" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 active:scale-[0.98] px-8 py-3.5 text-base font-semibold transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md">
              Войти в аккаунт
            </Link>
          </div>

          {/* Feature chips */}
          <div className="mt-12 flex flex-wrap gap-2 justify-center">
            {[
              "8 форматов опросов",
              "Слайды для проектора",
              "Quiz + лидерборд",
              "AI-резюме",
              "Стена идей",
              "Без установок",
            ].map((chip, i) => (
              <span
                key={chip}
                className="animate-fade-in rounded-full border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm px-3.5 py-1.5 text-xs text-slate-500 dark:text-slate-400"
                style={{ animationDelay: `${650 + i * 80}ms` }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Three pillars ─── */}
      <InViewSection className="mx-auto max-w-6xl px-6 md:px-10 py-24">
        <div className="mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Всё что нужно ведущему — в одном месте</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg">От первого слайда до финального резюме — без переключения между инструментами</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-[transform,box-shadow,border-color] duration-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-2xl mb-5">🗳️</div>
            <h3 className="text-lg font-bold mb-3">Вовлекайте зал</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">8 форматов опросов в реальном времени: от температуры настроения до Planning Poker и Стены идей. Участники голосуют по QR-коду без установки приложений.</p>
            <div className="flex flex-wrap gap-1.5">
              {["8 форматов", "Quiz + лидерборд", "Q&A с модерацией"].map((t) => (
                <span key={t} className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 text-xs font-medium">{t}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 hover:-translate-y-1 hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-800 transition-[transform,box-shadow,border-color] duration-200">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-2xl mb-5">📽️</div>
            <h3 className="text-lg font-bold mb-3">Управляйте экраном</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">Слайды-заставки, карточки спикеров, расписание, Колесо фортуны и экстренные объявления — всё выводится на проектор одной кнопкой из панели ведущего.</p>
            <div className="flex flex-wrap gap-1.5">
              {["7 типов экранов", "Колесо фортуны", "Объявления"].map((t) => (
                <span key={t} className="rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-0.5 text-xs font-medium">{t}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800 transition-[transform,box-shadow,border-color] duration-200">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-2xl mb-5">✨</div>
            <h3 className="text-lg font-bold mb-3">Анализируйте итоги</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">YandexGPT выделяет 3 главные темы из 200 вопросов за секунды. После мероприятия — кнопка «AI-итог»: 3–5 предложений с ключевыми выводами по всем голосованиям.</p>
            <div className="flex flex-wrap gap-1.5">
              {["AI-анализ Q&A", "AI-резюме", "Экспорт PDF/CSV"].map((t) => (
                <span key={t} className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-medium">{t}</span>
              ))}
            </div>
          </div>
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
                AI работает<br />пока вы ведёте
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
                    <p className="font-semibold mb-1">Полный контроль</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Вопросы не появляются на экране автоматически. Вы выбираете, что показать — одной кнопкой.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-2xl shrink-0">📋</div>
                  <div>
                    <p className="font-semibold mb-1">AI-резюме после мероприятия</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Нажмите «✨ AI-итог» после завершения — YandexGPT проанализирует все голосования и вопросы, сформирует 3–5 предложений с выводами для отчёта.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QAPanel mock */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl shadow-slate-100 dark:shadow-slate-950/50 hover:-translate-y-1 hover:shadow-2xl transition-[transform,box-shadow] duration-300">
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

      {/* ─── Slides section ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-10 py-24">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          {/* Left: text */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs text-purple-600 dark:text-purple-300 mb-6">
              📽️ Презентационные экраны
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
              Больше, чем<br />голосования
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Управляйте тем, что видит зал, не выходя из панели ведущего. Слайды запускаются одной кнопкой — рядом с опросами в одном лайн-апе.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { icon: "🎯", title: "Заставка", desc: "Название, дата и место мероприятия пока зал собирается" },
                { icon: "🎤", title: "Карточка спикера", desc: "Фото, должность, тема — автоматически до выхода на сцену" },
                { icon: "🗓️", title: "Расписание", desc: "Текущий блок выделен, прошедшие зачёркнуты" },
                { icon: "🎡", title: "Колесо фортуны", desc: "Розыгрыш приза или выбор случайного участника за 3 секунды" },
              ].map((s) => (
                <div key={s.title} className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right: slide type grid mock */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl shadow-slate-100 dark:shadow-slate-950/50">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Лайн-ап мероприятия</span>
              <span className="text-xs text-slate-400">DevConf 2025</span>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {[
                { icon: "🎯", label: "Заставка", badge: "экран", color: "purple" },
                { icon: "📊", label: "Как оцениваете доклад?", badge: "опрос", color: "indigo" },
                { icon: "🎤", label: "Следующий спикер", badge: "экран", color: "purple" },
                { icon: "❓", label: "Вопросы к докладчику", badge: "Q&A", color: "indigo" },
                { icon: "🎡", label: "Розыгрыш приза", badge: "колесо", color: "purple" },
                { icon: "🎉", label: "Финальный экран", badge: "экран", color: "purple" },
              ].map((item) => (
                <div key={item.label} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${item.color === "purple" ? "border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-500/5" : "border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-500/5"}`}>
                  <span className="text-base">{item.icon}</span>
                  <span className={`text-sm font-medium flex-1 ${item.color === "purple" ? "text-purple-900 dark:text-purple-200" : "text-indigo-900 dark:text-indigo-200"}`}>{item.label}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${item.color === "purple" ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400" : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"}`}>{item.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Quiz + Leaderboard ─── */}
      <section className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 py-24">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            {/* Left: leaderboard mock */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl shadow-slate-100 dark:shadow-slate-950/50">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">🏆 Лидерборд</span>
                <span className="text-xs text-slate-400">после вопроса 3/5</span>
              </div>
              <div className="p-4">
                <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">✓ Правильный ответ</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">Принципы SOLID</p>
                </div>
                {[
                  { rank: 1, name: "AB12F3", score: "3/3", gold: true },
                  { rank: 2, name: "7C9D2A", score: "3/3", gold: false },
                  { rank: 3, name: "F4E8B1", score: "2/3", gold: false },
                  { rank: 4, name: "3A55CD", score: "2/3", gold: false },
                  { rank: 5, name: "9E0F4B", score: "1/3", gold: false },
                ].map((p) => (
                  <div key={p.name} className={`flex items-center gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 last:border-0 ${p.gold ? "opacity-100" : "opacity-70"}`}>
                    <span className={`w-6 text-center text-sm font-bold ${p.rank === 1 ? "text-yellow-500" : p.rank === 2 ? "text-slate-400" : p.rank === 3 ? "text-amber-600" : "text-slate-400"}`}>#{p.rank}</span>
                    <span className="font-mono text-sm text-slate-600 dark:text-slate-400 flex-1">{p.name.toUpperCase()}</span>
                    <span className={`text-sm font-semibold ${p.gold ? "text-green-500" : "text-slate-500"}`}>{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Right: text */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-600 dark:text-amber-300 mb-6">
                🎯 Квиз-режим
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                Сделайте<br />из опроса игру
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Включите квиз-режим для любого вопроса с вариантами ответов. Добавьте правильный ответ и пояснение.
              </p>
              <div className="flex flex-col gap-5">
                {[
                  { icon: "🔒", title: "Ответ скрыт до закрытия", desc: "Участники видят результаты только после того, как ведущий закрывает опрос." },
                  { icon: "📱", title: "Мгновенный фидбек на телефоне", desc: "«Правильно! 🎉» или «Неправильно 😔» — каждый узнаёт свой результат." },
                  { icon: "🏆", title: "Лидерборд на экране", desc: "Топ-5 самых точных участников с количеством правильных ответов по серии вопросов." },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4">
                    <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white mb-0.5">{f.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
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
        <div className="mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">8 форматов голосований</h2>
          <p className="text-slate-500 dark:text-slate-400">Под любой сценарий — от настроения зала до командного планирования</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { icon: "📊", name: "Множественный выбор", desc: "Живая гистограмма, квиз-режим, до 5 вариантов выбора" },
            { icon: "🌡️", name: "Шкала температуры", desc: "Настроение аудитории от ❄️ до 🔥" },
            { icon: "👍", name: "Лайк / Дизлайк", desc: "Быстрая бинарная реакция: да или нет" },
            { icon: "☁️", name: "Облако слов", desc: "Свободные ответы — популярные слова крупнее" },
            { icon: "😊", name: "Облако эмодзи", desc: "Эмоциональная реакция зала одним нажатием" },
            { icon: "🃏", name: "Planning Poker", desc: "Оценка задач без давления авторитетов" },
            { icon: "❓", name: "Q&A", desc: "Вопросы с модерацией, лайками и AI-анализом" },
            { icon: "💡", name: "Стена идей", desc: "Цветные карточки идей в реальном времени" },
          ].map((t) => (
            <div key={t.name} className="animate-slide-up rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-white dark:hover:bg-slate-800/50 transition-[transform,box-shadow,border-color,background-color] duration-200">
              <div className="text-3xl mb-3">{t.icon}</div>
              <p className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-white">{t.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 py-24">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">Как это работает</h2>
          <div className="relative flex flex-col gap-0">
            {/* Vertical connector */}
            <div className="absolute left-6 top-14 bottom-14 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" aria-hidden="true" />

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
            ].map((item, i) => (
              <div key={item.step} className={`flex gap-8 items-start ${i < 2 ? "pb-12" : ""}`}>
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-sm z-10 shadow-sm shadow-indigo-500/20">
                  {item.step}
                </div>
                <div className="pt-1 pb-2">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h3 className="text-lg font-semibold mb-1.5">{item.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-10 py-24">
        <div className="mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Тарифы</h2>
          <p className="text-slate-500 dark:text-slate-400">Начните бесплатно, масштабируйте по мере роста</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: "Бесплатный",
              price: "0 ₽",
              period: "навсегда",
              desc: "Для первых шагов",
              features: ["До 30 участников", "3 мероприятия в месяц", "5 опросов на сессию", "Все 7 типов голосований", "QR-код + дисплейный экран"],
              cta: "Начать бесплатно",
              href: "/auth/register",
              highlight: false,
            },
            {
              name: "Старт",
              price: "490 ₽",
              period: "в месяц",
              desc: "Для разовых выступлений",
              features: ["До 100 участников", "Безлимит мероприятий", "10 опросов на сессию", "Экспорт CSV / PNG", "Шаблоны мероприятий"],
              cta: "Выбрать Старт",
              href: "/auth/register",
              highlight: false,
            },
            {
              name: "Про",
              price: "990 ₽",
              period: "в месяц",
              desc: "Для регулярных мероприятий",
              features: ["До 500 участников", "Безлимит опросов", "✨ AI-анализ и AI-резюме", "Слайды и презентации", "Таймер и лимит голосов"],
              cta: "Попробовать Про",
              href: "/auth/register",
              highlight: true,
            },
            {
              name: "Команда",
              price: "2 490 ₽",
              period: "в месяц",
              desc: "Для агентств и корпораций",
              features: ["Безлимит участников", "До 5 ведущих", "⚪ Белый лейбл", "Все функции Про", "Приоритетная поддержка"],
              cta: "Связаться с нами",
              href: "mailto:oleko85@gmail.com",
              highlight: false,
            },
          ].map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-6 flex flex-col transition-[transform,box-shadow] duration-200 ${plan.highlight ? "border-indigo-500 bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-600/30" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700"}`}>
              <p className={`text-sm font-semibold mb-1 ${plan.highlight ? "text-indigo-200" : "text-slate-500 dark:text-slate-400"}`}>{plan.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className={`text-sm mb-1 ${plan.highlight ? "text-indigo-200" : "text-slate-400"}`}>{plan.period}</span>
              </div>
              <p className={`text-sm mb-5 ${plan.highlight ? "text-indigo-200" : "text-slate-500 dark:text-slate-400"}`}>{plan.desc}</p>
              <ul className="flex flex-col gap-2 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-indigo-100" : "text-slate-600 dark:text-slate-300"}`}>
                    <span className={`mt-0.5 shrink-0 ${plan.highlight ? "text-indigo-200" : "text-indigo-500"}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className={`block w-full rounded-xl py-2.5 text-sm font-semibold text-center transition-colors ${plan.highlight ? "bg-white text-indigo-600 hover:bg-indigo-50" : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
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
              Следующее выступление —<br />под вашим контролем.
            </h2>
            <p className="text-indigo-200 mb-10 text-lg">Опросы, слайды, Quiz, AI — всё готово. Создайте мероприятие за 2 минуты.</p>
            <Link href="/auth/register" className="inline-block rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] px-10 py-4 text-base font-bold transition-[background-color,transform] duration-150 shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
              Начать бесплатно
            </Link>
            <p className="text-indigo-300 text-sm mt-4">Бесплатный план — навсегда</p>
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
