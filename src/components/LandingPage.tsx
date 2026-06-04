"use client";

import React from "react";
import Link from "next/link";
import {
  ChartBar, Monitor, Sparkle,
  ChatCircleDots, Screencast, ClipboardText,
  Target, Microphone, Calendar, ArrowsClockwise,
  Lock, DeviceMobile, Trophy,
  Cloud, Thermometer, Smiley, ThumbsUp, Cards, Question, Lightbulb,
  Gear, QrCode, WifiHigh,
  ArrowUp, Check,
} from "@phosphor-icons/react";
import { InViewSection } from "@/components/InViewSection";
import { InViewAnimate } from "@/components/InViewAnimate";
import { ThemeToggle } from "@/components/ThemeToggle";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">

      {/* ─── Nav ─── */}
      <nav aria-label="Основная навигация" className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <Link href="/" className="text-lg font-bold tracking-tight">LivePoll AI</Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/auth/login" className="hidden sm:block text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-3 py-2.5">
            Войти
          </Link>
          <Link href="/auth/register" className="rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] duration-150">
            Начать бесплатно
          </Link>
        </div>
      </nav>

      {/* ─── Hero — asymmetric split ─── */}
      <section className="relative overflow-hidden bg-zinc-950 pt-16 pb-20 md:pt-20 md:pb-28">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full"
          aria-hidden="true"
          style={{ background: "radial-gradient(ellipse 80% 60% at 20% 40%, oklch(0.42 0.16 272 / 0.35), transparent)" }}
        />
        <div className="relative mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid lg:grid-cols-[1fr_380px] gap-12 xl:gap-20 items-center">

            {/* Left: copy */}
            <div className="max-w-lg">
              <div className="mb-5 h-px w-16 bg-indigo-500/50 animate-fade-in" style={{ animationDelay: "80ms" }} aria-hidden="true" />
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-1.5 text-xs text-indigo-300 mb-7 animate-fade-in" style={{ animationDelay: "150ms" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Powered by YandexGPT
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-white animate-fade-in" style={{ animationDelay: "200ms" }}>
                Аудитория говорит.
                <br />
                <span className="text-indigo-400">Вы слышите каждого.</span>
              </h1>
              <p className="mt-6 text-lg text-zinc-400 leading-relaxed animate-fade-in" style={{ animationDelay: "350ms" }}>
                Опросы в реальном времени, слайды и AI-анализ для ведущего. Участники голосуют по QR-коду без установки приложений.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: "500ms" }}>
                <Link href="/auth/register" className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] px-8 py-3.5 text-base font-semibold text-white transition-[background-color,transform,box-shadow] duration-150 shadow-lg shadow-indigo-600/40 hover:shadow-indigo-500/50 hover:-translate-y-0.5 hover:shadow-xl">
                  Создать первый опрос
                </Link>
                <Link href="/auth/login" className="rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/8 active:scale-[0.98] px-8 py-3.5 text-base font-semibold text-white/90 transition-[background-color,border-color,transform] duration-150 hover:-translate-y-0.5">
                  Войти в аккаунт
                </Link>
              </div>
            </div>

            {/* Right: product preview */}
            <div className="flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="relative">
                <div className="w-[260px] rounded-[2.75rem] bg-zinc-900 ring-1 ring-white/10 shadow-2xl shadow-indigo-950/60 overflow-hidden">
                  <div className="flex justify-between items-center px-7 pt-4 pb-0 text-[10px] text-zinc-500">
                    <span>9:41</span>
                    <span className="text-zinc-600">●●●</span>
                  </div>
                  <div className="px-5 pt-3 pb-3 border-b border-zinc-800">
                    <p className="text-[10px] text-indigo-400 font-semibold mb-0.5 uppercase tracking-wider">DevConf 2025</p>
                    <p className="text-white text-[13px] font-semibold leading-snug">Как оцениваете доклад?</p>
                  </div>
                  <div className="px-5 py-4 space-y-3.5">
                    {[
                      { label: "Отлично", pct: 54 },
                      { label: "Хорошо", pct: 31 },
                      { label: "Нейтрально", pct: 15 },
                    ].map((opt, i) => (
                      <div key={opt.label}>
                        <div className="flex justify-between text-[11px] mb-1.5">
                          <span className="text-zinc-300">{opt.label}</span>
                          <span className="text-indigo-400 font-bold">{opt.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full animate-bar-fill"
                            style={{ width: `${opt.pct}%`, animationDelay: `${500 + i * 120}ms` } as React.CSSProperties}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-zinc-500">247 голосов · в эфире</span>
                    </div>
                  </div>
                  <div className="mx-4 mb-5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg shrink-0 p-1.5 grid grid-cols-3 gap-px">
                      {[true,true,false,true,false,true,false,true,true].map((filled, i) => (
                        <div key={i} className={`rounded-sm ${filled ? "bg-zinc-900" : "bg-zinc-200"}`} />
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400">Присоединиться</p>
                      <p className="text-[11px] text-white font-bold">livepoll.ru/join</p>
                    </div>
                  </div>
                </div>
                <div
                  className="absolute inset-0 -z-10 blur-3xl opacity-20"
                  aria-hidden="true"
                  style={{ background: "radial-gradient(ellipse at center, oklch(0.56 0.23 263), transparent 70%)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Three pillars ─── */}
      <InViewSection stagger className="mx-auto max-w-6xl px-6 md:px-10 py-20">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Всё что нужно ведущему в одном месте</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-lg">От первого слайда до финального резюме без переключения между инструментами</p>
        </div>
        <div className="grid md:grid-cols-2 gap-10 xl:gap-16">

          {/* Primary pillar: Polling */}
          <div className="stagger-item">
            <div className="text-indigo-600 dark:text-indigo-400 mb-5"><ChartBar size={40} weight="bold" /></div>
            <h3 className="text-2xl font-bold mb-4">Вовлекайте зал</h3>
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">8 форматов опросов в реальном времени: от температуры настроения до Planning Poker. Участники голосуют по QR-коду без установки приложений.</p>
            <div className="flex flex-wrap gap-1.5">
              {["8 форматов", "Quiz + лидерборд", "Q&A с модерацией"].map((t) => (
                <span key={t} className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{t}</span>
              ))}
            </div>
          </div>

          {/* Secondary: Slides + AI stacked */}
          <div className="stagger-item flex flex-col gap-8 md:border-l md:border-zinc-200 md:dark:border-zinc-800 md:pl-10 xl:pl-16">
            <div className="flex gap-4">
              <div className="shrink-0 text-purple-600 dark:text-purple-400 mt-1"><Monitor size={24} weight="bold" /></div>
              <div>
                <h3 className="text-lg font-bold mb-2">Управляйте экраном</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">Слайды-заставки, карточки спикеров, расписание, Колесо фортуны и объявления. Всё выводится на проектор одной кнопкой из панели ведущего.</p>
                <div className="flex flex-wrap gap-1.5">
                  {["7 типов экранов", "Колесо фортуны", "Объявления"].map((t) => (
                    <span key={t} className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-100 dark:border-zinc-800" />
            <div className="flex gap-4">
              <div className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-1"><Sparkle size={24} weight="bold" /></div>
              <div>
                <h3 className="text-lg font-bold mb-2">Анализируйте итоги</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">YandexGPT выделяет ключевые темы из сотен вопросов за секунды. После мероприятия нажмите «AI-итог»: 3–5 предложений с выводами по всем голосованиям.</p>
                <div className="flex flex-wrap gap-1.5">
                  {["AI-анализ Q&A", "AI-резюме", "Экспорт PDF/CSV"].map((t) => (
                    <span key={t} className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </InViewSection>

      {/* ─── AI block ─── */}
      <section className="bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 py-24">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <InViewAnimate enterClass="animate-from-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">AI работает<br />пока вы ведёте</h2>
              <div className="flex flex-col gap-6">
                {[
                  { icon: <ChatCircleDots size={24} weight="bold" />, title: "Q&A без хаоса", desc: "200 вопросов из зала? ИИ выделяет 3 главные темы за секунды. Вы отвечаете по делу, а не тонете в потоке." },
                  { icon: <Screencast size={24} weight="bold" />, title: "Полный контроль", desc: "Вопросы не появляются на экране автоматически. Вы выбираете, что показать, одной кнопкой." },
                  { icon: <ClipboardText size={24} weight="bold" />, title: "AI-резюме после мероприятия", desc: "Нажмите «✨ AI-итог» после завершения. YandexGPT проанализирует все голосования и вопросы, сформирует 3–5 предложений с выводами для отчёта." },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4">
                    <div className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400">{f.icon}</div>
                    <div>
                      <p className="font-semibold mb-1">{f.title}</p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </InViewAnimate>

            <InViewAnimate enterClass="animate-from-right" delay={80} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl shadow-zinc-100 dark:shadow-zinc-950/50 hover:-translate-y-1 hover:shadow-2xl transition-[transform,box-shadow] duration-300">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Q&A <span className="text-zinc-400 font-normal">(12)</span></span>
                <span className="rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">✨ AI-анализ</span>
              </div>
              <div className="mx-4 mt-4 rounded-lg bg-indigo-600/10 border border-indigo-600/20 p-3 text-xs text-zinc-700 dark:text-zinc-300">
                <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">✨ AI</p>
                <p className="leading-relaxed">1. <b>Масштабирование</b> — про горизонтальное масштабирование и базы данных.<br />2. <b>Безопасность</b> — аутентификация и защита API.<br />3. <b>Тестирование</b> — как тестировать микросервисы в изоляции.</p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {[
                  { text: "Как вы решаете проблему согласованности данных между сервисами?", upvotes: 14, pinned: true },
                  { text: "Какой подход к логированию используете в продакшне?", upvotes: 9, pinned: false },
                  { text: "Есть ли смысл переходить на микросервисы если команда меньше 10 человек?", upvotes: 7, pinned: false },
                ].map((q) => (
                  <div key={q.text} className={`rounded-lg border p-3 flex items-start gap-2 ${q.pinned ? "border-indigo-500/30 bg-indigo-500/5" : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50"}`}>
                    <p className="flex-1 text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{q.text}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <ArrowUp size={10} weight="bold" className="text-indigo-500" />
                      <span className="text-xs text-indigo-500 font-semibold">{q.upvotes}</span>
                      {q.pinned && <Monitor size={12} className="text-indigo-400 ml-1" />}
                    </div>
                  </div>
                ))}
              </div>
            </InViewAnimate>
          </div>
        </div>
      </section>

      {/* ─── Slides section ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-10 py-24">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <InViewAnimate enterClass="animate-from-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs text-purple-600 dark:text-purple-300 mb-6">
              <Monitor size={12} /> Презентационные экраны
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">Слайды, таймеры<br />и розыгрыш призов</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">Управляйте тем, что видит зал, не выходя из панели ведущего. Слайды запускаются одной кнопкой рядом с опросами в едином лайн-апе.</p>
            <div className="flex flex-col gap-4">
              {[
                { icon: <Target size={18} weight="bold" />, title: "Заставка", desc: "Название, дата и место мероприятия пока зал собирается" },
                { icon: <Microphone size={18} weight="bold" />, title: "Карточка спикера", desc: "Фото, должность, тема. Автоматически до выхода на сцену" },
                { icon: <Calendar size={18} weight="bold" />, title: "Расписание", desc: "Текущий блок выделен, прошедшие зачёркнуты" },
                { icon: <ArrowsClockwise size={18} weight="bold" />, title: "Колесо фортуны", desc: "Розыгрыш приза или выбор случайного участника за 3 секунды" },
              ].map((s) => (
                <div key={s.title} className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 text-purple-500 dark:text-purple-400">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{s.title}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </InViewAnimate>

          <InViewAnimate enterClass="animate-from-right" delay={80} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl shadow-zinc-100 dark:shadow-zinc-950/50 hover:-translate-y-1 hover:shadow-2xl transition-[transform,box-shadow] duration-300">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">Лайн-ап мероприятия</span>
              <span className="text-xs text-zinc-400">DevConf 2025</span>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {[
                { icon: <Target size={14} />, label: "Заставка", badge: "экран", color: "purple" },
                { icon: <ChartBar size={14} />, label: "Как оцениваете доклад?", badge: "опрос", color: "indigo" },
                { icon: <Microphone size={14} />, label: "Следующий спикер", badge: "экран", color: "purple" },
                { icon: <Question size={14} />, label: "Вопросы к докладчику", badge: "Q&A", color: "indigo" },
                { icon: <ArrowsClockwise size={14} />, label: "Розыгрыш приза", badge: "колесо", color: "purple" },
                { icon: <Sparkle size={14} />, label: "Финальный экран", badge: "экран", color: "purple" },
              ].map((item) => (
                <div key={item.label} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${item.color === "purple" ? "border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-500/5" : "border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-500/5"}`}>
                  <span className={item.color === "purple" ? "text-purple-500" : "text-indigo-500"}>{item.icon}</span>
                  <span className={`text-sm font-medium flex-1 ${item.color === "purple" ? "text-purple-900 dark:text-purple-200" : "text-indigo-900 dark:text-indigo-200"}`}>{item.label}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${item.color === "purple" ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400" : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"}`}>{item.badge}</span>
                </div>
              ))}
            </div>
          </InViewAnimate>
        </div>
      </section>

      {/* ─── Quiz ─── */}
      <section className="bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 py-24 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid lg:grid-cols-[1fr_460px] gap-14 items-center">

            {/* Left: copy */}
            <InViewAnimate enterClass="animate-from-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-600 dark:text-amber-400 mb-6">
                <Trophy size={12} weight="bold" /> Квиз-режим
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight text-zinc-900 dark:text-white mb-5">
                Правильные ответы скрыты.<br />
                <span className="text-amber-500 dark:text-amber-400">Лидерборд на главном экране.</span>
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed max-w-md">
                Включите квиз-режим и опрос превращается в игру. Ответы скрыты, результаты закрыты: вы открываете их когда захотите. Зал в ожидании своей позиции в лидерборде.
              </p>
              <div className="flex flex-col gap-5">
                {[
                  { icon: <Lock size={18} weight="bold" />, title: "Ответы скрыты до вашего сигнала", desc: "Никто не знает результат, пока вы не откроете. Максимум интриги в зале." },
                  { icon: <DeviceMobile size={18} weight="bold" />, title: "Мгновенный фидбек на телефоне", desc: "«Правильно» или «Нет»: каждый узнаёт результат в ту же секунду." },
                  { icon: <Trophy size={18} weight="bold" />, title: "Лидерборд зажигает зал", desc: "Топ-5 на главном экране. Зал аплодирует победителю и просит ещё раунд." },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      {f.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white mb-0.5">{f.title}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </InViewAnimate>

            {/* Right: phone + leaderboard */}
            <InViewAnimate enterClass="animate-from-right" delay={80} className="flex flex-col sm:flex-row gap-3 items-center sm:items-start justify-center lg:justify-end">

              {/* Phone: participant view */}
              <div className="w-[158px] shrink-0 rounded-[2rem] bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-white/10 shadow-xl shadow-zinc-200/80 dark:shadow-black/60 overflow-hidden">
                <div className="flex justify-between items-center px-5 pt-3.5 pb-0 text-[9px] text-zinc-400 dark:text-zinc-600">
                  <span>9:41</span>
                  <span>●●●</span>
                </div>
                <div className="px-3.5 pt-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                  <p className="text-[8px] text-amber-500 dark:text-amber-400 font-semibold uppercase tracking-wider mb-0.5">Квиз · Вопрос 3</p>
                  <p className="text-zinc-900 dark:text-white text-[10px] font-semibold leading-snug">Что такое SOLID?</p>
                </div>
                <div className="px-3.5 py-2.5 space-y-1.5">
                  {[
                    { label: "Принципы ООП", correct: true },
                    { label: "Паттерн БД", correct: false },
                    { label: "Протокол сети", correct: false },
                  ].map((opt) => (
                    <div key={opt.label} className={`rounded-lg px-2.5 py-1.5 text-[9px] font-medium flex items-center gap-1.5 ${opt.correct ? "bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400" : "bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/40 text-zinc-400 dark:text-zinc-500"}`}>
                      {opt.correct ? <Check size={9} weight="bold" /> : <span className="w-[9px]" />}
                      {opt.label}
                    </div>
                  ))}
                </div>
                <div className="mx-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/25 px-3 py-2 text-center">
                  <p className="text-green-600 dark:text-green-400 font-bold text-xs">Правильно! ✓</p>
                  <p className="text-green-600/50 dark:text-green-400/60 text-[9px] mt-0.5">Вы на 2 месте</p>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="flex-1 min-w-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 overflow-hidden shadow-xl shadow-zinc-100 dark:shadow-zinc-950/50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
                    <Trophy size={14} weight="bold" className="text-amber-500 dark:text-amber-400" /> Лидерборд
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600">3 / 5</span>
                </div>
                <div className="px-3.5 py-3">
                  <div className="mb-3 rounded-xl border border-green-500/20 bg-green-500/[0.07] px-3 py-2">
                    <p className="flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400 mb-0.5">
                      <Check size={10} weight="bold" /> Правильный ответ
                    </p>
                    <p className="text-[13px] font-bold text-zinc-900 dark:text-white">Принципы SOLID</p>
                  </div>
                  {[
                    { rank: 1, name: "AB12F3", score: "3/3", top: true },
                    { rank: 2, name: "7C9D2A", score: "3/3", top: false },
                    { rank: 3, name: "F4E8B1", score: "2/3", top: false },
                    { rank: 4, name: "3A55CD", score: "2/3", top: false },
                    { rank: 5, name: "9E0F4B", score: "1/3", top: false },
                  ].map((p) => (
                    <div key={p.name} className={`flex items-center gap-2.5 py-2 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 ${p.top ? "opacity-100" : "opacity-40"}`}>
                      <span className={`w-5 text-center text-xs font-bold tabular-nums ${p.rank === 1 ? "text-amber-500 dark:text-amber-400" : p.rank === 2 ? "text-zinc-400" : p.rank === 3 ? "text-amber-700" : "text-zinc-400"}`}>
                        {p.rank}
                      </span>
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 flex-1 truncate">{p.name}</span>
                      <span className={`text-xs font-semibold tabular-nums ${p.top ? "text-green-600 dark:text-green-400" : "text-zinc-400 dark:text-zinc-600"}`}>{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>

            </InViewAnimate>
          </div>
        </div>
      </section>

      {/* ─── Poll types ─── */}
      <InViewSection stagger className="mx-auto max-w-6xl px-6 md:px-10 py-20">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">8 форматов голосований</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Под любой сценарий: от настроения зала до командного планирования</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-12 lg:gap-x-20">
          {[
            { icon: <ChartBar size={26} weight="bold" />, name: "Множественный выбор", desc: "Живая гистограмма, квиз-режим, до 5 вариантов выбора" },
            { icon: <Cloud size={26} weight="bold" />, name: "Облако слов", desc: "Свободные ответы: популярные слова крупнее" },
            { icon: <Thermometer size={26} weight="bold" />, name: "Шкала температуры", desc: "Настроение аудитории от холодного до горячего" },
            { icon: <Smiley size={26} weight="bold" />, name: "Облако эмодзи", desc: "Эмоциональная реакция зала одним нажатием" },
            { icon: <ThumbsUp size={26} weight="bold" />, name: "Лайк / Дизлайк", desc: "Быстрая бинарная реакция: да или нет" },
            { icon: <Cards size={26} weight="bold" />, name: "Planning Poker", desc: "Оценка задач без давления авторитетов" },
            { icon: <Question size={26} weight="bold" />, name: "Q&A", desc: "Вопросы с модерацией, лайками и AI-анализом" },
            { icon: <Lightbulb size={26} weight="bold" />, name: "Стена идей", desc: "Цветные карточки идей в реальном времени" },
          ].map((t) => (
            <div key={t.name} className="stagger-item flex items-start gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
              <span className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400">{t.icon}</span>
              <div className="pt-0.5">
                <p className="font-semibold text-zinc-900 dark:text-white mb-0.5">{t.name}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </InViewSection>

      {/* ─── How it works ─── */}
      <InViewSection stagger className="bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 py-24">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">Как это работает</h2>
          <div className="relative flex flex-col gap-0">
            <div className="absolute left-6 top-14 bottom-14 w-px bg-zinc-200 dark:bg-zinc-700 hidden md:block" aria-hidden="true" />
            {[
              { step: "01", icon: <Gear size={22} weight="bold" />, title: "Создайте мероприятие", desc: "Добавьте опросы нужных типов, задайте таймер или лимит голосов. Получите QR-код и ссылку для участников." },
              { step: "02", icon: <QrCode size={22} weight="bold" />, title: "Участники сканируют QR", desc: "Никаких приложений и регистраций. Открывается браузер, сразу интерфейс голосования. Телефон достаточно." },
              { step: "03", icon: <WifiHigh size={22} weight="bold" />, title: "Управляйте залом в реальном времени", desc: "Запускайте опросы, выводите вопросы на экран, смотрите результаты. Всё синхронизируется мгновенно." },
            ].map((item, i) => (
              <div key={item.step} className={`stagger-item flex gap-8 items-start ${i < 2 ? "pb-12" : ""}`}>
                <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm z-10 shadow-md shadow-indigo-600/30">
                  {item.step}
                </div>
                <div className="pt-1 pb-2">
                  <div className="text-indigo-400 mb-2">{item.icon}</div>
                  <h3 className="text-lg font-semibold mb-1.5">{item.title}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </InViewSection>

      {/* ─── Pricing ─── */}
      <InViewSection stagger className="mx-auto max-w-6xl px-6 md:px-10 py-24">
        <div className="mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Тарифы</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Начните бесплатно, добавляйте возможности по мере роста</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Бесплатный", price: "0 ₽", period: "навсегда", desc: "Для первых шагов", features: ["До 30 участников", "3 мероприятия в месяц", "5 опросов на сессию", "Все 8 форматов голосований", "QR-код + дисплейный экран"], cta: "Начать бесплатно", href: "/auth/register", highlight: false },
            { name: "Старт", price: "490 ₽", period: "в месяц", desc: "Для разовых выступлений", features: ["До 100 участников", "Безлимит мероприятий", "10 опросов на сессию", "Экспорт CSV / PNG", "Шаблоны мероприятий"], cta: "Выбрать Старт", href: "/auth/register", highlight: false },
            { name: "Про", price: "990 ₽", period: "в месяц", desc: "Для регулярных мероприятий", features: ["До 500 участников", "Безлимит опросов", "✨ AI-анализ и AI-резюме", "Слайды и презентации", "Таймер и лимит голосов"], cta: "Попробовать Про", href: "/auth/register", highlight: true },
            { name: "Команда", price: "2 490 ₽", period: "в месяц", desc: "Для агентств и корпораций", features: ["Безлимит участников", "До 5 ведущих", "Белый лейбл", "Все функции Про", "Приоритетная поддержка"], cta: "Связаться с нами", href: "mailto:oleko85@gmail.com", highlight: false },
          ].map((plan) => (
            <div key={plan.name} className={`stagger-item rounded-2xl border p-6 flex flex-col transition-[transform,box-shadow] duration-200 ${plan.highlight ? "border-transparent bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-600/35" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-zinc-600"}`}>
              <p className={`text-sm font-semibold mb-1 ${plan.highlight ? "text-indigo-200" : "text-zinc-500 dark:text-zinc-400"}`}>{plan.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className={`text-sm mb-1 ${plan.highlight ? "text-indigo-200" : "text-zinc-500"}`}>{plan.period}</span>
              </div>
              <p className={`text-sm mb-5 ${plan.highlight ? "text-indigo-200" : "text-zinc-500 dark:text-zinc-400"}`}>{plan.desc}</p>
              <ul className="flex flex-col gap-2 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-indigo-100" : "text-zinc-600 dark:text-zinc-300"}`}>
                    <span className={`mt-0.5 shrink-0 ${plan.highlight ? "text-indigo-200" : "text-indigo-500"}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className={`block w-full rounded-xl py-3 text-sm font-semibold text-center transition-[background-color,transform] duration-150 active:scale-[0.97] ${plan.highlight ? "bg-white text-indigo-600 hover:bg-indigo-50 shimmer-hover" : "border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </InViewSection>

      {/* ─── CTA ─── */}
      <section className="mx-auto max-w-4xl px-6 md:px-10 pb-24">
        <InViewAnimate enterClass="animate-scale-in">
          <div className="rounded-2xl bg-indigo-600 p-12 md:p-16 text-center text-white overflow-hidden">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Следующее выступление<br />под вашим контролем.</h2>
            <p className="text-indigo-200 mb-10 text-lg">Опросы, слайды, Quiz и AI: всё уже готово. Создайте мероприятие за 2 минуты.</p>
            <Link href="/auth/register" className="inline-block rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] px-10 py-4 text-base font-bold transition-[background-color,transform] duration-150 shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
              Начать бесплатно
            </Link>
            <p className="text-indigo-300 text-sm mt-4">Бесплатный план навсегда</p>
          </div>
        </InViewAnimate>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 md:px-10 py-8">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-zinc-900 dark:text-white">LivePoll AI</span>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">© {new Date().getFullYear()} LivePoll AI. Все права защищены.</p>
          <div className="flex gap-6 text-xs text-zinc-400 dark:text-zinc-600">
            <Link href="/help" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Помощь</Link>
            <Link href="/docs/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Политика конфиденциальности</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
