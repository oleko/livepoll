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
import { LangToggle } from "@/components/LangToggle";
import { useTranslations } from "next-intl";

export function LandingPage() {
  const t = useTranslations("Landing");
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">

      {/* ─── Nav ─── */}
      <nav aria-label={t("nav.ariaLabel")} className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <Link href="/" className="text-lg font-bold tracking-tight">Kvoroom</Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
          <Link href="/auth/login" className="hidden sm:block text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-3 py-2.5">
            {t("nav.signIn")}
          </Link>
          <Link href="/auth/register" className="rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] duration-150">
            {t("nav.getStarted")}
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
                {t("hero.headline1")}
                <br />
                <span className="text-indigo-400">{t("hero.headline2")}</span>
              </h1>
              <p className="mt-6 text-lg text-zinc-400 leading-relaxed animate-fade-in" style={{ animationDelay: "350ms" }}>
                {t("hero.subtext")}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: "500ms" }}>
                <Link href="/auth/register" className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] px-8 py-3.5 text-base font-semibold text-white transition-[background-color,transform,box-shadow] duration-150 shadow-lg shadow-indigo-600/40 hover:shadow-indigo-500/50 hover:-translate-y-0.5 hover:shadow-xl">
                  {t("hero.ctaPrimary")}
                </Link>
                <Link href="/auth/login" className="rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/8 active:scale-[0.98] px-8 py-3.5 text-base font-semibold text-white/90 transition-[background-color,border-color,transform] duration-150 hover:-translate-y-0.5">
                  {t("hero.ctaSecondary")}
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
                    <p className="text-[10px] text-indigo-400 font-semibold mb-0.5 uppercase tracking-wider">{t("hero.mockupEvent")}</p>
                    <p className="text-white text-[13px] font-semibold leading-snug">{t("hero.mockupQuestion")}</p>
                  </div>
                  <div className="px-5 py-4 space-y-3.5">
                    {[
                      { labelKey: "hero.mockupOpt1" as const, pct: 54 },
                      { labelKey: "hero.mockupOpt2" as const, pct: 31 },
                      { labelKey: "hero.mockupOpt3" as const, pct: 15 },
                    ].map((opt, i) => (
                      <div key={opt.labelKey}>
                        <div className="flex justify-between text-[11px] mb-1.5">
                          <span className="text-zinc-300">{t(opt.labelKey)}</span>
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
                      <span className="text-[10px] text-zinc-500">{t("hero.liveLabel")}</span>
                    </div>
                  </div>
                  <div className="mx-4 mb-5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg shrink-0 p-1.5 grid grid-cols-3 gap-px">
                      {[true,true,false,true,false,true,false,true,true].map((filled, i) => (
                        <div key={i} className={`rounded-sm ${filled ? "bg-zinc-900" : "bg-zinc-200"}`} />
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400">{t("hero.joinLabel")}</p>
                      <p className="text-[11px] text-white font-bold">{t("hero.mockupJoinUrl")}</p>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("pillars.heading")}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-lg">{t("pillars.subtext")}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-10 xl:gap-16">

          {/* Primary pillar: Polling */}
          <div className="stagger-item">
            <div className="text-indigo-600 dark:text-indigo-400 mb-5"><ChartBar size={40} weight="bold" /></div>
            <h3 className="text-2xl font-bold mb-4">{t("pillars.poll.title")}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">{t("pillars.poll.desc")}</p>
            <div className="flex flex-wrap gap-1.5">
              {t.raw("pillars.poll.tags").map((tag: string) => (
                <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{tag}</span>
              ))}
            </div>
          </div>

          {/* Secondary: Slides + AI stacked */}
          <div className="stagger-item flex flex-col gap-8 md:border-l md:border-zinc-200 md:dark:border-zinc-800 md:pl-10 xl:pl-16">
            <div className="flex gap-4">
              <div className="shrink-0 text-purple-600 dark:text-purple-400 mt-1"><Monitor size={24} weight="bold" /></div>
              <div>
                <h3 className="text-lg font-bold mb-2">{t("pillars.screen.title")}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">{t("pillars.screen.desc")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.raw("pillars.screen.tags").map((tag: string) => (
                    <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-100 dark:border-zinc-800" />
            <div className="flex gap-4">
              <div className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-1"><Sparkle size={24} weight="bold" /></div>
              <div>
                <h3 className="text-lg font-bold mb-2">{t("pillars.ai.title")}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">{t("pillars.ai.desc")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.raw("pillars.ai.tags").map((tag: string) => (
                    <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{tag}</span>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">{t("ai.heading1")}<br />{t("ai.heading2")}</h2>
              <div className="flex flex-col gap-6">
                {[
                  <ChatCircleDots key="0" size={24} weight="bold" />,
                  <Screencast key="1" size={24} weight="bold" />,
                  <ClipboardText key="2" size={24} weight="bold" />,
                ].map((icon, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400">{icon}</div>
                    <div>
                      <p className="font-semibold mb-1">{t(`ai.features.${i}.title`)}</p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{t(`ai.features.${i}.desc`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </InViewAnimate>

            <InViewAnimate enterClass="animate-from-right" delay={80} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl shadow-zinc-100 dark:shadow-zinc-950/50 hover:-translate-y-1 hover:shadow-2xl transition-[transform,box-shadow] duration-300">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Q&A <span className="text-zinc-400 font-normal">(12)</span></span>
                <span className="rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">{t("ai.mockupButton")}</span>
              </div>
              <div className="mx-4 mt-4 rounded-lg bg-indigo-600/10 border border-indigo-600/20 p-3 text-xs text-zinc-700 dark:text-zinc-300">
                <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">✨ AI</p>
                <p className="leading-relaxed">
                  1. <b>{t("ai.mockupTheme1")}</b> — {t("ai.mockupTheme1Desc")}.<br />
                  2. <b>{t("ai.mockupTheme2")}</b> — {t("ai.mockupTheme2Desc")}.<br />
                  3. <b>{t("ai.mockupTheme3")}</b> — {t("ai.mockupTheme3Desc")}.
                </p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {[
                  { textKey: "ai.mockupQ1" as const, upvotes: 14, pinned: true },
                  { textKey: "ai.mockupQ2" as const, upvotes: 9, pinned: false },
                  { textKey: "ai.mockupQ3" as const, upvotes: 7, pinned: false },
                ].map((q) => (
                  <div key={q.textKey} className={`rounded-lg border p-3 flex items-start gap-2 ${q.pinned ? "border-indigo-500/30 bg-indigo-500/5" : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50"}`}>
                    <p className="flex-1 text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{t(q.textKey)}</p>
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
              <Monitor size={12} /> {t("slides.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">{t("slides.heading1")}<br />{t("slides.heading2")}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">{t("slides.desc")}</p>
            <div className="flex flex-col gap-4">
              {[
                <Target key="0" size={18} weight="bold" />,
                <Microphone key="1" size={18} weight="bold" />,
                <Calendar key="2" size={18} weight="bold" />,
                <ArrowsClockwise key="3" size={18} weight="bold" />,
              ].map((icon, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 text-purple-500 dark:text-purple-400">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t(`slides.items.${i}.title`)}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{t(`slides.items.${i}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </InViewAnimate>

          <InViewAnimate enterClass="animate-from-right" delay={80} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl shadow-zinc-100 dark:shadow-zinc-950/50 hover:-translate-y-1 hover:shadow-2xl transition-[transform,box-shadow] duration-300">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">{t("slides.lineupTitle")}</span>
              <span className="text-xs text-zinc-400">DevConf 2025</span>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {[
                { icon: <Target size={14} />, color: "purple" },
                { icon: <ChartBar size={14} />, color: "indigo" },
                { icon: <Microphone size={14} />, color: "purple" },
                { icon: <Question size={14} />, color: "indigo" },
                { icon: <ArrowsClockwise size={14} />, color: "purple" },
                { icon: <Sparkle size={14} />, color: "purple" },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${item.color === "purple" ? "border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-500/5" : "border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-500/5"}`}>
                  <span className={item.color === "purple" ? "text-purple-500" : "text-indigo-500"}>{item.icon}</span>
                  <span className={`text-sm font-medium flex-1 ${item.color === "purple" ? "text-purple-900 dark:text-purple-200" : "text-indigo-900 dark:text-indigo-200"}`}>{t(`slides.lineupItems.${i}.label`)}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${item.color === "purple" ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400" : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"}`}>{t(`slides.lineupItems.${i}.badge`)}</span>
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
                <Trophy size={12} weight="bold" /> {t("quiz.badge")}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight text-zinc-900 dark:text-white mb-5">
                {t("quiz.heading1")}<br />
                <span className="text-amber-500 dark:text-amber-400">{t("quiz.heading2")}</span>
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed max-w-md">
                {t("quiz.desc")}
              </p>
              <div className="flex flex-col gap-5">
                {[
                  <Lock key="0" size={18} weight="bold" />,
                  <DeviceMobile key="1" size={18} weight="bold" />,
                  <Trophy key="2" size={18} weight="bold" />,
                ].map((icon, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      {icon}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white mb-0.5">{t(`quiz.features.${i}.title`)}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{t(`quiz.features.${i}.desc`)}</p>
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
                  <p className="text-[8px] text-amber-500 dark:text-amber-400 font-semibold uppercase tracking-wider mb-0.5">{t("quiz.mockup.tag")}</p>
                  <p className="text-zinc-900 dark:text-white text-[10px] font-semibold leading-snug">{t("quiz.mockup.question")}</p>
                </div>
                <div className="px-3.5 py-2.5 space-y-1.5">
                  {([
                    { key: "opt0", correct: true },
                    { key: "opt1", correct: false },
                    { key: "opt2", correct: false },
                  ] as const).map((opt) => (
                    <div key={opt.key} className={`rounded-lg px-2.5 py-1.5 text-[9px] font-medium flex items-center gap-1.5 ${opt.correct ? "bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400" : "bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/40 text-zinc-400 dark:text-zinc-500"}`}>
                      {opt.correct ? <Check size={9} weight="bold" /> : <span className="w-[9px]" />}
                      {t(`quiz.mockup.${opt.key}`)}
                    </div>
                  ))}
                </div>
                <div className="mx-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/25 px-3 py-2 text-center">
                  <p className="text-green-600 dark:text-green-400 font-bold text-xs">{t("quiz.mockup.correct")}</p>
                  <p className="text-green-600/50 dark:text-green-400/60 text-[9px] mt-0.5">{t("quiz.mockup.rank")}</p>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="flex-1 min-w-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 overflow-hidden shadow-xl shadow-zinc-100 dark:shadow-zinc-950/50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
                    <Trophy size={14} weight="bold" className="text-amber-500 dark:text-amber-400" /> {t("quiz.leaderboardLabel")}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600">3 / 5</span>
                </div>
                <div className="px-3.5 py-3">
                  <div className="mb-3 rounded-xl border border-green-500/20 bg-green-500/[0.07] px-3 py-2">
                    <p className="flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400 mb-0.5">
                      <Check size={10} weight="bold" /> {t("quiz.correctAnswerLabel")}
                    </p>
                    <p className="text-[13px] font-bold text-zinc-900 dark:text-white">{t("quiz.mockup.correctAnswer")}</p>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("pollTypes.heading")}</h2>
          <p className="text-zinc-500 dark:text-zinc-400">{t("pollTypes.desc")}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-12 lg:gap-x-20">
          {[
            <ChartBar key="0" size={26} weight="bold" />,
            <Cloud key="1" size={26} weight="bold" />,
            <Thermometer key="2" size={26} weight="bold" />,
            <Smiley key="3" size={26} weight="bold" />,
            <ThumbsUp key="4" size={26} weight="bold" />,
            <Cards key="5" size={26} weight="bold" />,
            <Question key="6" size={26} weight="bold" />,
            <Lightbulb key="7" size={26} weight="bold" />,
          ].map((icon, i) => (
            <div key={i} className="stagger-item flex items-start gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
              <span className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400">{icon}</span>
              <div className="pt-0.5">
                <p className="font-semibold text-zinc-900 dark:text-white mb-0.5">{t(`pollTypes.types.${i}.label`)}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t(`pollTypes.types.${i}.desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </InViewSection>

      {/* ─── How it works ─── */}
      <InViewSection stagger className="bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 py-24">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">{t("howItWorks.heading")}</h2>
          <div className="relative flex flex-col gap-0">
            <div className="absolute left-6 top-14 bottom-14 w-px bg-zinc-200 dark:bg-zinc-700 hidden md:block" aria-hidden="true" />
            {[
              <Gear key="0" size={22} weight="bold" />,
              <QrCode key="1" size={22} weight="bold" />,
              <WifiHigh key="2" size={22} weight="bold" />,
            ].map((icon, i) => (
              <div key={i} className={`stagger-item flex gap-8 items-start ${i < 2 ? "pb-12" : ""}`}>
                <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm z-10 shadow-md shadow-indigo-600/30">
                  {t(`howItWorks.steps.${i}.step`)}
                </div>
                <div className="pt-1 pb-2">
                  <div className="text-indigo-400 mb-2">{icon}</div>
                  <h3 className="text-lg font-semibold mb-1.5">{t(`howItWorks.steps.${i}.title`)}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{t(`howItWorks.steps.${i}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </InViewSection>

      {/* ─── Pricing ─── */}
      <InViewSection stagger className="mx-auto max-w-6xl px-6 md:px-10 py-24">
        <div className="mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("pricing.heading")}</h2>
          <p className="text-zinc-500 dark:text-zinc-400">{t("pricing.desc")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: "/auth/register", highlight: false },
            { href: "/auth/register", highlight: false },
            { href: "/auth/register", highlight: true },
            { href: "mailto:oleko85@gmail.com", highlight: false },
          ].map((plan, i) => (
            <div key={i} className={`stagger-item rounded-2xl border p-6 flex flex-col transition-[transform,box-shadow] duration-200 ${plan.highlight ? "border-transparent bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-600/35" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-zinc-600"}`}>
              <p className={`text-sm font-semibold mb-1 ${plan.highlight ? "text-indigo-200" : "text-zinc-500 dark:text-zinc-400"}`}>{t(`pricing.plans.${i}.name`)}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-bold">{t(`pricing.plans.${i}.price`)}</span>
                <span className={`text-sm mb-1 ${plan.highlight ? "text-indigo-200" : "text-zinc-500"}`}>{t(`pricing.plans.${i}.period`)}</span>
              </div>
              <p className={`text-sm mb-5 ${plan.highlight ? "text-indigo-200" : "text-zinc-500 dark:text-zinc-400"}`}>{t(`pricing.plans.${i}.desc`)}</p>
              <ul className="flex flex-col gap-2 mb-7 flex-1">
                {t.raw(`pricing.plans.${i}.features`).map((f: string) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-indigo-100" : "text-zinc-600 dark:text-zinc-300"}`}>
                    <span className={`mt-0.5 shrink-0 ${plan.highlight ? "text-indigo-200" : "text-indigo-500"}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className={`block w-full rounded-xl py-3 text-sm font-semibold text-center transition-[background-color,transform] duration-150 active:scale-[0.97] ${plan.highlight ? "bg-white text-indigo-600 hover:bg-indigo-50 shimmer-hover" : "border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
                {t(`pricing.plans.${i}.cta`)}
              </Link>
            </div>
          ))}
        </div>
      </InViewSection>

      {/* ─── CTA ─── */}
      <section className="mx-auto max-w-4xl px-6 md:px-10 pb-24">
        <InViewAnimate enterClass="animate-scale-in">
          <div className="rounded-2xl bg-indigo-600 p-12 md:p-16 text-center text-white overflow-hidden">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("cta.heading1")}<br />{t("cta.heading2")}</h2>
            <p className="text-indigo-200 mb-10 text-lg">{t("cta.subtext")}</p>
            <Link href="/auth/register" className="inline-block rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] px-10 py-4 text-base font-bold transition-[background-color,transform] duration-150 shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
              {t("cta.button")}
            </Link>
            <p className="text-indigo-300 text-sm mt-4">{t("cta.tagline")}</p>
          </div>
        </InViewAnimate>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 md:px-10 py-8">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-zinc-900 dark:text-white">Kvoroom</span>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-6 text-xs text-zinc-400 dark:text-zinc-600">
            <Link href="/help" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">{t("footer.links.help")}</Link>
            <Link href="/docs/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">{t("footer.links.privacy")}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
