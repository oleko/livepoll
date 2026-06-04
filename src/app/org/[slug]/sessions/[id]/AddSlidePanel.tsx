"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSlide } from "@/lib/actions/slides";
import type { SlideType } from "@/lib/actions/slides";

const TYPE_META: Record<SlideType, { label: string; icon: string }> = {
  splash:       { label: "Заставка",    icon: "🎯" },
  speaker:      { label: "Спикер",      icon: "🎤" },
  schedule:     { label: "Расписание",  icon: "🗓" },
  quote:        { label: "Цитата",      icon: "💬" },
  final:        { label: "Финал",       icon: "🎉" },
  spin_wheel:   { label: "Колесо",      icon: "🎡" },
  announcement: { label: "Объявление",  icon: "📢" },
  reveal:       { label: "Вопрос-ответ", icon: "❓" },
};

type ScheduleItem = { time: string; title: string; active?: boolean };

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
  );
}

function SplashForm({ v, set }: { v: Record<string, string>; set: (v: Record<string, string>) => void }) {
  const f = (k: string): React.InputHTMLAttributes<HTMLInputElement> => ({
    value: v[k] ?? "",
    onChange: (e) => set({ ...v, [k]: e.target.value }),
  });
  return (
    <div className="space-y-2">
      <Input placeholder="Название мероприятия *" {...f("title")} />
      <Input placeholder="Подзаголовок / тема" {...f("subtitle")} />
      <Input placeholder="Дата" {...f("date")} />
      <Input placeholder="Место" {...f("location")} />
    </div>
  );
}

function SpeakerForm({ v, set }: { v: Record<string, string>; set: (v: Record<string, string>) => void }) {
  const f = (k: string): React.InputHTMLAttributes<HTMLInputElement> => ({
    value: v[k] ?? "",
    onChange: (e) => set({ ...v, [k]: e.target.value }),
  });
  return (
    <div className="space-y-2">
      <Input placeholder="Имя *" {...f("name")} />
      <Input placeholder="Должность" {...f("role")} />
      <Input placeholder="Компания" {...f("company")} />
      <Input placeholder="Тема доклада" {...f("topic")} />
      <Input placeholder="URL фото (необязательно)" {...f("photo_url")} />
    </div>
  );
}

function ScheduleForm({ v, set }: { v: { items?: ScheduleItem[] }; set: (v: { items: ScheduleItem[] }) => void }) {
  const items = v.items ?? [];
  const upd = (idx: number, patch: Partial<ScheduleItem>) =>
    set({ items: items.map((it, i) => i === idx ? { ...it, ...patch } : it) });
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input value={item.time} onChange={e => upd(idx, { time: e.target.value })} placeholder="10:00"
            className="w-16 shrink-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 dark:text-white"
          />
          <input value={item.title} onChange={e => upd(idx, { title: e.target.value })} placeholder="Блок"
            className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 dark:text-white"
          />
          <button type="button" onClick={() => set({ items: items.map((it, i) => ({ ...it, active: i === idx })) })}
            className={`text-sm px-1 ${item.active ? "text-purple-500" : "text-slate-300 hover:text-purple-400"}`}
          >▶</button>
          <button type="button" onClick={() => set({ items: items.filter((_, i) => i !== idx) })}
            className="text-slate-300 hover:text-red-400 text-xs px-0.5"
          >✕</button>
        </div>
      ))}
      <button type="button" onClick={() => set({ items: [...items, { time: "", title: "" }] })}
        className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
      >＋ Добавить пункт</button>
    </div>
  );
}

function QuoteForm({ v, set }: { v: Record<string, string>; set: (v: Record<string, string>) => void }) {
  return (
    <div className="space-y-2">
      <textarea value={v.text ?? ""} onChange={e => set({ ...v, text: e.target.value })}
        placeholder="Текст цитаты *" rows={3}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
      />
      <Input placeholder="Автор (необязательно)" value={v.author ?? ""} onChange={e => set({ ...v, author: e.target.value })} />
    </div>
  );
}

function AnnouncementForm({ v, set }: { v: Record<string, unknown>; set: (v: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-2">
      <textarea
        value={(v.text as string) ?? ""}
        onChange={e => set({ ...v, text: e.target.value })}
        rows={3}
        placeholder="Текст объявления *"
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Таймер</span>
        <select
          value={(v.duration as number | undefined) ?? 0}
          onChange={e => set({ ...v, duration: Number(e.target.value) })}
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value={0}>Без таймера</option>
          <option value={15}>15 секунд</option>
          <option value={30}>30 секунд</option>
          <option value={60}>1 минута</option>
          <option value={120}>2 минуты</option>
          <option value={300}>5 минут</option>
        </select>
      </div>
    </div>
  );
}

function SpinWheelForm({ v, set }: { v: Record<string, unknown>; set: (v: Record<string, unknown>) => void }) {
  const [rawText, setRawText] = useState(
    ((v.options as string[] | undefined) ?? []).join("\n")
  );
  return (
    <div className="space-y-2">
      <Input placeholder="Заголовок (необязательно)" value={(v.title as string) ?? ""}
        onChange={e => set({ ...v, title: e.target.value })} />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">Варианты (каждый с новой строки) *</span>
        <textarea
          value={rawText}
          onChange={e => {
            setRawText(e.target.value);
            set({ ...v, options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) });
          }}
          rows={5}
          placeholder={"Анна\nИван\nМария\nПётр"}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
      </div>
    </div>
  );
}

function RevealForm({ v, set }: { v: Record<string, unknown>; set: (v: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-2">
      <textarea
        value={(v.question as string) ?? ""}
        onChange={e => set({ ...v, question: e.target.value })}
        rows={2}
        placeholder="Вопрос для аудитории *"
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
      />
      <textarea
        value={(v.answer as string) ?? ""}
        onChange={e => set({ ...v, answer: e.target.value })}
        rows={2}
        placeholder="Правильный ответ"
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
      />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!v.buzz}
          onChange={e => set({ ...v, buzz: e.target.checked })}
          className="rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-xs text-slate-600 dark:text-slate-400">Кнопка «Я знаю!» для участников</span>
      </label>
    </div>
  );
}

function FinalForm({ v, set }: { v: Record<string, string>; set: (v: Record<string, string>) => void }) {
  const f = (k: string): React.InputHTMLAttributes<HTMLInputElement> => ({
    value: v[k] ?? "",
    onChange: (e) => set({ ...v, [k]: e.target.value }),
  });
  return (
    <div className="space-y-2">
      <Input placeholder="Заголовок *" {...f("title")} />
      <Input placeholder="Подзаголовок" {...f("subtitle")} />
      <Input placeholder="Ссылка на материалы" {...f("url")} />
    </div>
  );
}

export function AddSlidePanel({ sessionId, orgSlug, bare = false }: { sessionId: string; orgSlug: string; bare?: boolean }) {
  const router = useRouter();
  const [type, setType] = useState<SlideType>("splash");
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const result = await createSlide(sessionId, type, content, orgSlug);
      if ("error" in result) setError(result.error);
      else { setContent({}); router.refresh(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const inner = (
    <div className="space-y-4">
      {/* Type picker */}
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.entries(TYPE_META) as [SlideType, { label: string; icon: string }][]).map(([t, m]) => (
          <button key={t} type="button" onClick={() => { setType(t); setContent({}); setError(null); }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              type === t
                ? "bg-purple-600 text-white"
                : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300 dark:hover:border-purple-700"
            }`}
          >
            <span className="shrink-0">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Content form */}
      {type === "splash"       && <SplashForm      v={content as Record<string, string>} set={setContent} />}
      {type === "speaker"      && <SpeakerForm     v={content as Record<string, string>} set={setContent} />}
      {type === "schedule"     && <ScheduleForm    v={content as { items?: ScheduleItem[] }} set={setContent as (v: { items: ScheduleItem[] }) => void} />}
      {type === "quote"        && <QuoteForm       v={content as Record<string, string>} set={setContent} />}
      {type === "final"        && <FinalForm       v={content as Record<string, string>} set={setContent} />}
      {type === "spin_wheel"   && <SpinWheelForm   v={content} set={setContent} />}
      {type === "announcement" && <AnnouncementForm v={content} set={setContent} />}
      {type === "reveal"       && <RevealForm       v={content} set={setContent} />}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button type="button" onClick={save} disabled={saving}
        className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors"
      >{saving ? "Создаю…" : "Создать экран"}</button>
    </div>
  );

  if (bare) return inner;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">📽 Добавить экран</h2>
      {inner}
    </div>
  );
}
