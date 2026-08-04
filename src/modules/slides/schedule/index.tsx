import type { SlideTypeModule } from "@/core/modules/slide";
import type { Translator } from "@/core/settings/field";

type ScheduleItem = { time: string; title: string; active?: boolean };

function Display({ content }: { content: Record<string, unknown> }) {
  const items = ((content as { items?: ScheduleItem[] }).items) ?? [];
  const activeIdx = items.findIndex((it) => it.active);
  return (
    <div className="flex flex-col h-full px-16 py-14 gap-8">
      <h2 className="text-3xl font-bold text-white">Расписание</h2>
      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        {items.map((item, i) => {
          const isActive = i === activeIdx;
          const isPast = activeIdx >= 0 && i < activeIdx;
          return (
            <div key={i} className={`flex items-center gap-6 rounded-xl px-6 py-4 transition-all ${
              isActive ? "bg-indigo-600/20 border border-indigo-500/50" : "border border-transparent"
            }`}>
              <span className={`text-xl font-mono font-semibold shrink-0 w-16 ${
                isActive ? "text-indigo-400" : isPast ? "text-slate-600" : "text-slate-400"
              }`}>{item.time}</span>
              {isActive && <span className="text-indigo-400 shrink-0 text-lg">▶</span>}
              <span className={`text-xl lg:text-2xl font-medium ${
                isActive ? "text-white" : isPast ? "text-slate-600 line-through" : "text-slate-300"
              }`}>{item.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Editor({ value, onChange, t }: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  t: Translator;
}) {
  const items: ScheduleItem[] = (value.items as ScheduleItem[] | undefined) ?? [];
  const update = (idx: number, patch: Partial<ScheduleItem>) =>
    onChange({ ...value, items: items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const add = () => onChange({ ...value, items: [...items, { time: "", title: "" }] });
  const remove = (idx: number) => onChange({ ...value, items: items.filter((_, i) => i !== idx) });
  const setActive = (idx: number) => onChange({ ...value, items: items.map((it, i) => ({ ...it, active: i === idx })) });

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input
            value={item.time}
            onChange={(e) => update(idx, { time: e.target.value })}
            placeholder={t("Org.session.addSlidePanel.schedule.time")}
            className="w-16 shrink-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
          <input
            value={item.title}
            onChange={(e) => update(idx, { title: e.target.value })}
            placeholder={t("Org.session.addSlidePanel.schedule.block")}
            className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
          <button type="button" onClick={() => setActive(idx)}
            className={`text-sm px-1 ${item.active ? "text-indigo-500" : "text-slate-300 hover:text-indigo-400"}`}
          >▶</button>
          <button type="button" onClick={() => remove(idx)}
            className="text-slate-300 hover:text-red-400 text-xs px-0.5"
          >✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
        {t("Org.session.addSlidePanel.schedule.addItem")}
      </button>
    </div>
  );
}

export const schedule: SlideTypeModule = {
  id: "schedule",
  meta: { icon: "🗓", labelKey: "Org.shared.slideTypeLabel.schedule", order: 2 },
  content: {
    defaults: () => ({ items: [] }),
    fromRow: (raw) => (raw && typeof raw === "object" ? raw as Record<string, unknown> : { items: [] }),
    preview: (_c, t) => t("Org.session.pollList.slidePreview.schedule"),
    Editor,
  },
  participantEffect: null,
  render: { display: Display },
};
