"use client";

import { useState, useEffect, useTransition } from "react";
import { createSlide, updateSlide, deleteSlide, showSlide, hideSlide, revealAnswer } from "@/lib/actions/slides";
import type { SlideType, SlideRow } from "@/lib/actions/slides";

const TYPE_META: Record<SlideType, { label: string; icon: string; description: string }> = {
  splash:       { label: "Заставка",        icon: "🎯", description: "Название мероприятия и подзаголовок" },
  speaker:      { label: "Спикер",          icon: "🎤", description: "Карточка докладчика" },
  schedule:     { label: "Расписание",      icon: "🗓", description: "Порядок выступлений" },
  quote:        { label: "Цитата",          icon: "💬", description: "Крупная цитата или тезис" },
  final:        { label: "Финал",           icon: "🎉", description: "Завершающий экран с контактами" },
  spin_wheel:   { label: "Колесо фортуны",  icon: "🎡", description: "Розыгрыш или случайный выбор" },
  announcement: { label: "Объявление",      icon: "📣", description: "Текст с таймером обратного отсчёта" },
  reveal:       { label: "Вопрос-ответ",    icon: "❓", description: "Вопрос для зала с раскрываемым ответом" },
};

function slideTitle(slide: SlideRow): string {
  const c = slide.content as Record<string, string>;
  switch (slide.type) {
    case "splash":   return c.title || "Заставка";
    case "speaker":  return c.name  || "Спикер";
    case "schedule": return "Расписание";
    case "quote":    return c.text ? `"${c.text.slice(0, 40)}${c.text.length > 40 ? "…" : ""}"` : "Цитата";
    case "final":       return c.title || "Финальный экран";
    case "spin_wheel":  return c.title || "Колесо фортуны";
    case "announcement": return c.text ? c.text.slice(0, 40) : "Объявление";
    case "reveal":       return c.question ? (c.question as string).slice(0, 40) : "Вопрос-ответ";
    default:            return "Слайд";
  }
}

// ─── Slide form per type ──────────────────────────────────────────────────────

function SplashForm({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const f = (k: string) => ({ value: value[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value }) });
  return (
    <div className="space-y-2">
      <Input placeholder="Название мероприятия *" {...f("title")} />
      <Input placeholder="Подзаголовок / тема" {...f("subtitle")} />
      <Input placeholder="Дата" {...f("date")} />
      <Input placeholder="Место проведения" {...f("location")} />
    </div>
  );
}

function SpeakerForm({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const f = (k: string) => ({ value: value[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value }) });
  return (
    <div className="space-y-2">
      <Input placeholder="Имя *" {...f("name")} />
      <Input placeholder="Должность" {...f("role")} />
      <Input placeholder="Компания / организация" {...f("company")} />
      <Input placeholder="Тема доклада" {...f("topic")} />
      <Input placeholder="URL фото (необязательно)" {...f("photo_url")} />
    </div>
  );
}

type ScheduleItem = { time: string; title: string; active?: boolean };

function ScheduleForm({ value, onChange }: {
  value: { items?: ScheduleItem[] };
  onChange: (v: { items: ScheduleItem[] }) => void;
}) {
  const items: ScheduleItem[] = value.items ?? [];

  function update(idx: number, patch: Partial<ScheduleItem>) {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    onChange({ items: next });
  }
  function add() { onChange({ items: [...items, { time: "", title: "" }] }); }
  function remove(idx: number) { onChange({ items: items.filter((_, i) => i !== idx) }); }
  function setActive(idx: number) {
    onChange({ items: items.map((it, i) => ({ ...it, active: i === idx })) });
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input
            value={item.time}
            onChange={e => update(idx, { time: e.target.value })}
            placeholder="10:00"
            className="w-16 shrink-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            value={item.title}
            onChange={e => update(idx, { title: e.target.value })}
            placeholder="Название блока"
            className="flex-1 min-w-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            title={item.active ? "Текущий блок" : "Пометить как текущий"}
            onClick={() => setActive(idx)}
            className={`text-sm px-1 transition-colors ${item.active ? "text-indigo-500" : "text-slate-300 dark:text-slate-600 hover:text-indigo-400"}`}
          >▶</button>
          <button type="button" onClick={() => remove(idx)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 text-xs px-0.5 transition-colors">✕</button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
      >＋ Добавить пункт</button>
    </div>
  );
}

function QuoteForm({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <div className="space-y-2">
      <textarea
        value={value.text ?? ""}
        onChange={e => onChange({ ...value, text: e.target.value })}
        placeholder="Текст цитаты *"
        rows={3}
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
      />
      <Input
        placeholder="Автор (необязательно)"
        value={value.author ?? ""}
        onChange={e => onChange({ ...value, author: e.target.value })}
      />
    </div>
  );
}

function FinalForm({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const f = (k: string) => ({ value: value[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value }) });
  return (
    <div className="space-y-2">
      <Input placeholder="Заголовок *" {...f("title")} />
      <Input placeholder="Подзаголовок" {...f("subtitle")} />
      <Input placeholder="Ссылка на материалы" {...f("url")} />
    </div>
  );
}

function RevealForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-2">
      <textarea
        value={(value.question as string) ?? ""}
        onChange={e => onChange({ ...value, question: e.target.value })}
        rows={2}
        placeholder="Вопрос для аудитории *"
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
      />
      <textarea
        value={(value.answer as string) ?? ""}
        onChange={e => onChange({ ...value, answer: e.target.value })}
        rows={2}
        placeholder="Правильный ответ"
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
      />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!value.buzz}
          onChange={e => onChange({ ...value, buzz: e.target.checked })}
          className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-xs text-slate-600 dark:text-slate-400">Кнопка «Я знаю!» для участников</span>
      </label>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}

function SlideForm({ type, content, onChange }: {
  type: SlideType;
  content: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const props = { value: content as Record<string, string>, onChange };
  switch (type) {
    case "splash":   return <SplashForm {...props} />;
    case "speaker":  return <SpeakerForm {...props} />;
    case "schedule": return <ScheduleForm value={content as { items?: ScheduleItem[] }} onChange={onChange as (v: { items: ScheduleItem[] }) => void} />;
    case "quote":    return <QuoteForm {...props} />;
    case "final":    return <FinalForm {...props} />;
    case "reveal":   return <RevealForm value={content} onChange={onChange} />;
  }
}

// ─── Slide card ───────────────────────────────────────────────────────────────

function SlideCard({
  slide, isActive, sessionId, orgSlug, onShow, onHide, onDeleted, onUpdated,
}: {
  slide: SlideRow; isActive: boolean; sessionId: string; orgSlug: string;
  onShow: () => void; onHide: () => void;
  onDeleted: () => void; onUpdated: (slide: SlideRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<Record<string, unknown>>(slide.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const meta = TYPE_META[slide.type];

  useEffect(() => { setRevealed(false); }, [isActive]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const result = await updateSlide(slide.id, content, sessionId, orgSlug);
      if ("error" in result) setError(result.error);
      else { setExpanded(false); onUpdated({ ...slide, content }); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleReveal() {
    setRevealed(true);
    await revealAnswer(slide.id, sessionId, orgSlug);
  }

  async function del() {
    if (!confirm(`Удалить слайд «${slideTitle(slide)}»?`)) return;
    setDeleting(true);
    try { await deleteSlide(slide.id, sessionId, orgSlug); onDeleted(); }
    finally { setDeleting(false); }
  }

  return (
    <div className={`rounded-xl border transition-colors ${isActive ? "border-indigo-400/60 bg-indigo-500/5 dark:bg-indigo-500/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-base shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{slideTitle(slide)}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{meta.label}</p>
        </div>
        {isActive && <span className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 shrink-0">На экране</span>}
        <div className="flex items-center gap-1 shrink-0">
          {isActive && slide.type === "reveal" && (
            revealed ? (
              <span className="h-7 flex items-center px-1 text-xs font-medium text-emerald-500">✓ Ответ</span>
            ) : (
              <button type="button" onClick={handleReveal}
                className="h-7 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 text-xs font-medium transition-colors"
              >Ответ</button>
            )
          )}
          {isActive ? (
            <button type="button" onClick={onHide}
              className="h-7 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >Убрать</button>
          ) : (
            <button type="button" onClick={onShow}
              className="h-7 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 text-xs font-medium transition-colors"
            >Показать</button>
          )}
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
          <button type="button" onClick={del} disabled={deleting}
            className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 transition-colors disabled:opacity-50"
          >{deleting ? "…" : "✕"}</button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
          <SlideForm type={slide.type} content={content} onChange={setContent} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium transition-colors"
            >{saving ? "Сохраняю…" : "Сохранить"}</button>
            <button type="button" onClick={() => setExpanded(false)}
              className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add slide form ───────────────────────────────────────────────────────────

function AddSlideForm({ sessionId, orgSlug, onClose, onCreated }: {
  sessionId: string; orgSlug: string; onClose: () => void;
  onCreated: (slide: SlideRow) => void;
}) {
  const [type, setType] = useState<SlideType>("splash");
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const result = await createSlide(sessionId, type, content, orgSlug);
      if ("error" in result) {
        setError(result.error);
      } else {
        onCreated({ id: result.id, session_id: sessionId, type, content, sort_order: 0, created_at: new Date().toISOString() });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.entries(TYPE_META) as [SlideType, typeof TYPE_META[SlideType]][]).map(([t, m]) => (
          <button key={t} type="button" onClick={() => { setType(t); setContent({}); }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${type === t ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700"}`}
          >
            <span className="text-base shrink-0">{m.icon}</span>
            <span className="text-xs font-medium leading-tight">{m.label}</span>
          </button>
        ))}
      </div>

      <SlideForm type={type} content={content} onChange={setContent} />

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium transition-colors"
        >{saving ? "Создаю…" : "Создать"}</button>
        <button type="button" onClick={onClose}
          className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >Отмена</button>
      </div>
    </div>
  );
}

// ─── SlidesPanel ──────────────────────────────────────────────────────────────

export function SlidesPanel({
  sessionId,
  orgSlug,
  initialSlides,
  initialActiveSlideId,
}: {
  sessionId: string;
  orgSlug: string;
  initialSlides: SlideRow[];
  initialActiveSlideId: string | null;
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [activeId, setActiveId] = useState(initialActiveSlideId);
  const [adding, setAdding] = useState(false);
  const [, startT] = useTransition();

  function handleCreated(slide: SlideRow) {
    setSlides(prev => [...prev, slide]);
    setAdding(false);
  }

  function handleDeleted(slideId: string) {
    setSlides(prev => prev.filter(s => s.id !== slideId));
    if (activeId === slideId) setActiveId(null);
  }

  function handleUpdated(slide: SlideRow) {
    setSlides(prev => prev.map(s => s.id === slide.id ? slide : s));
  }

  function handleShow(slideId: string) {
    setActiveId(slideId);
    startT(async () => { await showSlide(slideId, sessionId, orgSlug); });
  }

  function handleHide() {
    setActiveId(null);
    startT(async () => { await hideSlide(sessionId, orgSlug); });
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">📽 Экраны</h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >＋ Добавить</button>
        )}
      </div>

      <div className="space-y-2">
        {adding && (
          <AddSlideForm
            sessionId={sessionId}
            orgSlug={orgSlug}
            onClose={() => setAdding(false)}
            onCreated={handleCreated}
          />
        )}

        {slides.length === 0 && !adding && (
          <p className="text-xs text-slate-400 dark:text-slate-600 text-center py-4">
            Нет экранов. Создайте первый — он появится на проекторе одной кнопкой.
          </p>
        )}

        {slides.map(slide => (
          <SlideCard
            key={slide.id}
            slide={slide}
            isActive={activeId === slide.id}
            sessionId={sessionId}
            orgSlug={orgSlug}
            onShow={() => handleShow(slide.id)}
            onHide={handleHide}
            onDeleted={() => handleDeleted(slide.id)}
            onUpdated={handleUpdated}
          />
        ))}
      </div>
    </div>
  );
}
