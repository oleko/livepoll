"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSlide } from "@/lib/actions/slides";
import type { SlideType } from "@/lib/actions/slides";
import { Checkbox } from "@/components/ui/Checkbox";

const TYPE_ICON: Record<SlideType, string> = {
  splash:       "🎯",
  speaker:      "🎤",
  schedule:     "🗓",
  quote:        "💬",
  final:        "🎉",
  spin_wheel:   "🎡",
  announcement: "📢",
  reveal:       "❓",
};

type ScheduleItem = { time: string; title: string; active?: boolean };

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

function SplashForm({ v, set }: { v: Record<string, string>; set: (v: Record<string, string>) => void }) {
  const t = useTranslations("Org.session.addSlidePanel.splash");
  const f = (k: string): React.InputHTMLAttributes<HTMLInputElement> => ({
    value: v[k] ?? "",
    onChange: (e) => set({ ...v, [k]: e.target.value }),
  });
  return (
    <div className="space-y-2">
      <Input placeholder={t("title")} {...f("title")} />
      <Input placeholder={t("subtitle")} {...f("subtitle")} />
      <Input placeholder={t("date")} {...f("date")} />
      <Input placeholder={t("location")} {...f("location")} />
    </div>
  );
}

function SpeakerForm({ v, set }: { v: Record<string, string>; set: (v: Record<string, string>) => void }) {
  const t = useTranslations("Org.session.addSlidePanel.speaker");
  const f = (k: string): React.InputHTMLAttributes<HTMLInputElement> => ({
    value: v[k] ?? "",
    onChange: (e) => set({ ...v, [k]: e.target.value }),
  });
  return (
    <div className="space-y-2">
      <Input placeholder={t("name")} {...f("name")} />
      <Input placeholder={t("role")} {...f("role")} />
      <Input placeholder={t("company")} {...f("company")} />
      <Input placeholder={t("topic")} {...f("topic")} />
      <Input placeholder={t("photoUrl")} {...f("photo_url")} />
    </div>
  );
}

function ScheduleForm({ v, set }: { v: { items?: ScheduleItem[] }; set: (v: { items: ScheduleItem[] }) => void }) {
  const t = useTranslations("Org.session.addSlidePanel.schedule");
  const items = v.items ?? [];
  const upd = (idx: number, patch: Partial<ScheduleItem>) =>
    set({ items: items.map((it, i) => i === idx ? { ...it, ...patch } : it) });
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input value={item.time} onChange={e => upd(idx, { time: e.target.value })} placeholder={t("time")}
            className="w-16 shrink-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
          <input value={item.title} onChange={e => upd(idx, { title: e.target.value })} placeholder={t("block")}
            className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
          <button type="button" onClick={() => set({ items: items.map((it, i) => ({ ...it, active: i === idx })) })}
            className={`text-sm px-1 ${item.active ? "text-indigo-500" : "text-slate-300 hover:text-indigo-400"}`}
          >▶</button>
          <button type="button" onClick={() => set({ items: items.filter((_, i) => i !== idx) })}
            className="text-slate-300 hover:text-red-400 text-xs px-0.5"
          >✕</button>
        </div>
      ))}
      <button type="button" onClick={() => set({ items: [...items, { time: "", title: "" }] })}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
      >{t("addItem")}</button>
    </div>
  );
}

function QuoteForm({ v, set }: { v: Record<string, string>; set: (v: Record<string, string>) => void }) {
  const t = useTranslations("Org.session.addSlidePanel.quote");
  return (
    <div className="space-y-2">
      <textarea value={v.text ?? ""} onChange={e => set({ ...v, text: e.target.value })}
        placeholder={t("text")} rows={3}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
      <Input placeholder={t("author")} value={v.author ?? ""} onChange={e => set({ ...v, author: e.target.value })} />
    </div>
  );
}

function AnnouncementForm({ v, set }: { v: Record<string, unknown>; set: (v: Record<string, unknown>) => void }) {
  const t = useTranslations("Org.session.addSlidePanel.announcement");
  return (
    <div className="space-y-2">
      <textarea
        value={(v.text as string) ?? ""}
        onChange={e => set({ ...v, text: e.target.value })}
        rows={3}
        placeholder={t("text")}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{t("timer")}</span>
        <select
          value={(v.duration as number | undefined) ?? 0}
          onChange={e => set({ ...v, duration: Number(e.target.value) })}
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={0}>{t("noTimer")}</option>
          <option value={15}>{t("sec15")}</option>
          <option value={30}>{t("sec30")}</option>
          <option value={60}>{t("min1")}</option>
          <option value={120}>{t("min2")}</option>
          <option value={300}>{t("min5")}</option>
        </select>
      </div>
    </div>
  );
}

const SPIN_OPTION_MAX = 40;

function SpinWheelForm({ v, set }: { v: Record<string, unknown>; set: (v: Record<string, unknown>) => void }) {
  const t = useTranslations("Org.session.addSlidePanel.spinWheel");
  const [rawText, setRawText] = useState(
    ((v.options as string[] | undefined) ?? []).join("\n")
  );
  const tooLong = rawText.split("\n").some(s => s.trim().length > SPIN_OPTION_MAX);
  return (
    <div className="space-y-2">
      <Input placeholder={t("title")} value={(v.title as string) ?? ""}
        onChange={e => set({ ...v, title: e.target.value })} />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">{t("optionsLabel")}</span>
        <textarea
          value={rawText}
          onChange={e => {
            setRawText(e.target.value);
            set({ ...v, options: e.target.value.split("\n").map(s => s.trim().slice(0, SPIN_OPTION_MAX)).filter(Boolean) });
          }}
          rows={5}
          placeholder={t("optionsPlaceholder")}
          className={`w-full rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 resize-none ${
            tooLong
              ? "border-amber-400 dark:border-amber-500 focus:ring-amber-400"
              : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
          }`}
        />
        {tooLong && (
          <p className="text-xs text-amber-500">{t("tooLong", { max: SPIN_OPTION_MAX })}</p>
        )}
      </div>
    </div>
  );
}

function RevealForm({ v, set }: { v: Record<string, unknown>; set: (v: Record<string, unknown>) => void }) {
  const t = useTranslations("Org.session.addSlidePanel.reveal");
  return (
    <div className="space-y-2">
      <textarea
        value={(v.question as string) ?? ""}
        onChange={e => set({ ...v, question: e.target.value })}
        rows={2}
        placeholder={t("question")}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
      <textarea
        value={(v.answer as string) ?? ""}
        onChange={e => set({ ...v, answer: e.target.value })}
        rows={2}
        placeholder={t("answer")}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox
          checked={!!v.buzz}
          onCheckedChange={(checked) => set({ ...v, buzz: checked === true })}
        />
        <span className="text-xs text-slate-600 dark:text-slate-400">{t("buzz")}</span>
      </label>
    </div>
  );
}

function FinalForm({ v, set }: { v: Record<string, string>; set: (v: Record<string, string>) => void }) {
  const t = useTranslations("Org.session.addSlidePanel.final");
  const f = (k: string): React.InputHTMLAttributes<HTMLInputElement> => ({
    value: v[k] ?? "",
    onChange: (e) => set({ ...v, [k]: e.target.value }),
  });
  return (
    <div className="space-y-2">
      <Input placeholder={t("title")} {...f("title")} />
      <Input placeholder={t("subtitle")} {...f("subtitle")} />
      <Input placeholder={t("url")} {...f("url")} />
    </div>
  );
}

export function AddSlidePanel({ sessionId, orgSlug, bare = false }: { sessionId: string; orgSlug: string; bare?: boolean }) {
  const t = useTranslations("Org.session.addSlidePanel");
  const tShared = useTranslations("Org.shared");
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
      setError(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setSaving(false);
    }
  }

  const inner = (
    <div className="space-y-4">
      {/* Type picker */}
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(TYPE_ICON) as SlideType[]).map((st) => (
          <button key={st} type="button" onClick={() => { setType(st); setContent({}); setError(null); }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              type === st
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700"
            }`}
          >
            <span className="shrink-0">{TYPE_ICON[st]}</span>
            {tShared(`slideTypeLabel.${st}`)}
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
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors"
      >{saving ? t("creating") : t("create")}</button>
    </div>
  );

  if (bare) return inner;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("header")}</h2>
      {inner}
    </div>
  );
}
