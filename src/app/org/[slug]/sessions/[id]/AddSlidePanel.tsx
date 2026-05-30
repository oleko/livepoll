"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSlide } from "@/lib/actions/slides";
import type { SlideType } from "@/lib/actions/slides";

const TYPE_META: Record<SlideType, { label: string; icon: string }> = {
  splash:   { label: "Заставка",   icon: "🎯" },
  speaker:  { label: "Спикер",     icon: "🎤" },
  schedule: { label: "Расписание", icon: "🗓" },
  quote:    { label: "Цитата",     icon: "💬" },
  final:    { label: "Финал",      icon: "🎉" },
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

export function AddSlidePanel({ sessionId, orgSlug }: { sessionId: string; orgSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      else { setContent({}); setOpen(false); router.refresh(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">📽 Добавить экран</h2>

      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full rounded-lg border-2 border-dashed border-purple-200 dark:border-purple-900 hover:border-purple-400 dark:hover:border-purple-600 py-3 text-sm text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors font-medium"
        >
          ＋ Выбрать тип экрана
        </button>
      ) : (
        <div className="space-y-4">
          {/* Type picker */}
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(TYPE_META) as [SlideType, { label: string; icon: string }][]).map(([t, m]) => (
              <button key={t} type="button" onClick={() => { setType(t); setContent({}); }}
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
          {type === "splash"   && <SplashForm   v={content as Record<string, string>} set={setContent} />}
          {type === "speaker"  && <SpeakerForm  v={content as Record<string, string>} set={setContent} />}
          {type === "schedule" && <ScheduleForm v={content as { items?: ScheduleItem[] }} set={setContent as (v: { items: ScheduleItem[] }) => void} />}
          {type === "quote"    && <QuoteForm    v={content as Record<string, string>} set={setContent} />}
          {type === "final"    && <FinalForm    v={content as Record<string, string>} set={setContent} />}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors"
            >{saving ? "Создаю…" : "Создать"}</button>
            <button type="button" onClick={() => { setOpen(false); setError(null); setContent({}); }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}
