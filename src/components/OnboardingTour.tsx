"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "livepoll_onboarding_v1";

const STEPS = [
  {
    icon: "🎉",
    title: "Добро пожаловать в Kvoroom!",
    body: "Платформа для живых опросов и интерактива на мероприятиях. Этот тур покажет, как всё устроено — займёт меньше минуты.",
  },
  {
    icon: "📋",
    title: "Создайте мероприятие",
    body: "Нажмите «Новое мероприятие» на главной странице. Выберите шаблон или начните с нуля — добавьте опросы, слайды и настройте детали.",
  },
  {
    icon: "📊",
    title: "Добавляйте опросы",
    body: "8 форматов: выбор варианта, облако слов, Q&A, планирование покером, стена идей и другие. Каждый запускается одним кликом во время мероприятия.",
  },
  {
    icon: "📲",
    title: "Участники заходят без регистрации",
    body: "Поделитесь коротким кодом или QR — участники открывают ссылку /join/КОД и сразу голосуют. Никаких приложений и аккаунтов.",
  },
  {
    icon: "🖥️",
    title: "Экран для проектора",
    body: "Откройте /display/КОД на втором экране или проекторе. Результаты обновляются в реальном времени — красиво и без перезагрузки.",
  },
];

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  function dismiss() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
    }, 200);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={dismiss}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-200 ${closing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors text-lg leading-none"
          aria-label="Закрыть"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="text-5xl mb-5 select-none">{current.icon}</div>

        {/* Content */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 leading-snug">
          {current.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
          {current.body}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? "w-5 h-2 bg-indigo-500"
                  : "w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
              }`}
              aria-label={`Шаг ${i + 1}`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 w-full">
          {!isLast && (
            <button
              onClick={dismiss}
              className="flex-1 rounded-lg py-2.5 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Пропустить
            </button>
          )}
          <button
            onClick={next}
            className={`rounded-lg py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors ${isLast ? "w-full" : "flex-1"}`}
          >
            {isLast ? "Начать работу" : "Дальше →"}
          </button>
        </div>
      </div>
    </div>
  );
}
