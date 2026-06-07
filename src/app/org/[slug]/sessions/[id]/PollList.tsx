"use client";

import { useState, useTransition, useEffect, useRef, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { activatePoll, closePoll, copyPoll, updatePoll, showPollOnDisplay, hidePollFromDisplay } from "@/lib/actions/polls";
import { movePollSection, createSection, deleteSection, renameSection } from "@/lib/actions/sections";
import { showSlide, hideSlide, deleteSlide, updateSlide, reorderSlides, moveSlideToSection } from "@/lib/actions/slides";
import { revealPoker } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/Button";
import { EditIcon } from "@/components/icons";
import type { Poll, SessionStatus } from "@/types/database";
import type { SlideRow, SlideType } from "@/lib/actions/slides";

const SLIDE_TYPE_META: Record<SlideType, { label: string; icon: string }> = {
  splash:     { label: "Заставка",   icon: "🎯" },
  speaker:    { label: "Спикер",     icon: "🎤" },
  schedule:   { label: "Расписание", icon: "🗓" },
  quote:      { label: "Цитата",     icon: "💬" },
  final:      { label: "Финал",      icon: "🎉" },
  spin_wheel:   { label: "Колесо",      icon: "🎡" },
  announcement: { label: "Объявление",  icon: "📢" },
  reveal:       { label: "Вопрос-ответ", icon: "❓" },
};

function slidePreview(slide: SlideRow): string {
  const c = slide.content as Record<string, string>;
  switch (slide.type) {
    case "splash":   return c.title || "Без названия";
    case "speaker":  return c.name  || "Без имени";
    case "schedule": return "Расписание";
    case "quote":    return c.text ? `"${c.text.slice(0, 50)}${c.text.length > 50 ? "…" : ""}"` : "Цитата";
    case "final":    return c.title || "Финальный экран";
    default:         return "Слайд";
  }
}

type ScheduleItem = { time: string; title: string; active?: boolean };

function SlideEditForm({ slide, onDone, onCancel }: {
  slide: SlideRow;
  onDone: (content: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState<Record<string, unknown>>(slide.content);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    await updateSlide(slide.id, content, slide.session_id, "");
    router.refresh();
    onDone(content);
    setSaving(false);
  }

  const inp = (k: string) => ({
    value: (content as Record<string, string>)[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setContent({ ...content, [k]: e.target.value }),
    className: "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500",
  });

  return (
    <div className="space-y-2 pt-3 border-t border-purple-100 dark:border-purple-900/40">
      {slide.type === "splash" && <>
        <input placeholder="Название *" {...inp("title")} />
        <input placeholder="Подзаголовок" {...inp("subtitle")} />
        <input placeholder="Дата" {...inp("date")} />
        <input placeholder="Место" {...inp("location")} />
      </>}
      {slide.type === "speaker" && <>
        <input placeholder="Имя *" {...inp("name")} />
        <input placeholder="Должность" {...inp("role")} />
        <input placeholder="Компания" {...inp("company")} />
        <input placeholder="Тема доклада" {...inp("topic")} />
        <input placeholder="URL фото" {...inp("photo_url")} />
      </>}
      {slide.type === "quote" && <>
        <textarea
          value={(content as Record<string, string>).text ?? ""}
          onChange={e => setContent({ ...content, text: e.target.value })}
          placeholder="Текст цитаты *" rows={2}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
        <input placeholder="Автор" {...inp("author")} />
      </>}
      {slide.type === "schedule" && (
        <div className="space-y-1.5">
          {((content as { items?: ScheduleItem[] }).items ?? []).map((item, idx) => {
            const items = (content as { items: ScheduleItem[] }).items;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                <input value={item.time} onChange={e => setContent({ ...content, items: items.map((it, i) => i === idx ? { ...it, time: e.target.value } : it) })}
                  placeholder="10:00" className="w-16 shrink-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 dark:text-white" />
                <input value={item.title} onChange={e => setContent({ ...content, items: items.map((it, i) => i === idx ? { ...it, title: e.target.value } : it) })}
                  placeholder="Блок" className="flex-1 min-w-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 dark:text-white" />
                <button type="button" onClick={() => setContent({ ...content, items: items.map((it, i) => ({ ...it, active: i === idx })) })}
                  className={`text-sm px-1 ${item.active ? "text-purple-500" : "text-slate-300 hover:text-purple-400"}`}>▶</button>
                <button type="button" onClick={() => setContent({ ...content, items: items.filter((_, i) => i !== idx) })}
                  className="text-slate-300 hover:text-red-400 text-xs px-0.5">✕</button>
              </div>
            );
          })}
          <button type="button" onClick={() => setContent({ ...content, items: [...((content as { items?: ScheduleItem[] }).items ?? []), { time: "", title: "" }] })}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline">＋ Добавить пункт</button>
        </div>
      )}
      {slide.type === "final" && <>
        <input placeholder="Заголовок *" {...inp("title")} />
        <input placeholder="Подзаголовок" {...inp("subtitle")} />
        <input placeholder="Ссылка на материалы" {...inp("url")} />
      </>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-medium transition-colors"
        >{saving ? "…" : "Сохранить"}</button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >Отмена</button>
      </div>
    </div>
  );
}

function SlideLineupCard({
  slide, isActive, sessionId, orgSlug, isDragging, onDragStart, onDragEnd, sections,
}: {
  slide: SlideRow; isActive: boolean; sessionId: string; orgSlug: string;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  sections?: SectionItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const meta = SLIDE_TYPE_META[slide.type];

  async function handleShow() {
    setPending(true);
    await showSlide(slide.id, sessionId, orgSlug);
    router.refresh();
    setPending(false);
  }

  async function handleHide() {
    setPending(true);
    await hideSlide(sessionId, orgSlug);
    router.refresh();
    setPending(false);
  }

  async function handleDelete() {
    if (!confirm(`Удалить «${slidePreview(slide)}»?`)) return;
    setPending(true);
    await deleteSlide(slide.id, sessionId, orgSlug);
    router.refresh();
  }

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      className={`rounded-xl border px-4 py-3.5 transition-[border-color,box-shadow,opacity] duration-150 select-none cursor-grab active:cursor-grabbing
        ${isDragging ? "opacity-30 scale-95" : ""}
        ${isActive
          ? "border-purple-500/40 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.06)]"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-300 dark:text-slate-600 text-base leading-none shrink-0 select-none">⠿</span>
        <span className="text-xl shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate text-slate-900 dark:text-white">{slidePreview(slide)}</p>
          <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{meta.label}</p>
        </div>
        {isActive && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />На экране
          </span>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {sections && sections.length > 0 && (
            <select
              value={slide.section_id ?? ""}
              disabled={pending}
              onChange={async (e) => {
                setPending(true);
                await moveSlideToSection(slide.id, sessionId, e.target.value || null, orgSlug);
                router.refresh();
                setPending(false);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Без секции</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          )}
          <button type="button" onClick={() => setEditing(v => !v)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          ><EditIcon size={13} /></button>
          {isActive ? (
            <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={handleHide} disabled={pending}>Убрать</Button>
          ) : (
            <Button className="text-xs py-1.5 px-3" onClick={handleShow} disabled={pending}>Показать</Button>
          )}
          <button type="button" onClick={handleDelete} disabled={pending}
            className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 transition-colors disabled:opacity-50"
          >✕</button>
        </div>
      </div>

      {editing && (
        <SlideEditForm slide={slide} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      )}
    </div>
  );
}

type CopyTarget = { id: string; title: string; status: string };
type SectionItem = { id: string; title: string; sort_order: number };
type PollRow = Pick<Poll, "id" | "title" | "type" | "status" | "sort_order"> & {
  options: unknown[];
  created_at: string;
  section_id: string | null;
};

// ─── CopyPollButton ───────────────────────────────────────────────────────────

function CopyPollButton({ pollId, orgSlug, targets }: { pollId: string; orgSlug: string; targets: CopyTarget[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handle(targetId: string) {
    setPending(targetId);
    await copyPoll(pollId, targetId, orgSlug);
    setPending(null);
    setDone(targetId);
    setTimeout(() => { setDone(null); setOpen(false); }, 1200);
  }

  const STATUS_LABEL: Record<string, string> = { draft: "Черновик", active: "Идёт" };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)} title="Скопировать в другое мероприятие"
        className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs"
      >⎘</button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">Скопировать в:</p>
          {targets.map(t => (
            <button key={t.id} type="button" disabled={!!pending} onClick={() => handle(t.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{t.title}</span>
              {done === t.id ? <span className="text-xs font-semibold text-green-500 shrink-0">✓</span>
                : pending === t.id ? <span className="text-xs text-slate-400 shrink-0">…</span>
                : <span className="text-[11px] text-slate-400 shrink-0">{STATUS_LABEL[t.status] ?? t.status}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<Poll["type"], string> = {
  multiple_choice: "Множественный выбор",
  temperature:     "Шкала температуры",
  qa:              "Q&A",
  like_dislike:    "Лайк / Дизлайк",
  word_cloud:      "Облако слов",
  emoji_cloud:     "Облако эмодзи",
  planning_poker:  "Planning Poker",
  idea_wall:       "Стена идей",
};

const TYPE_ICON: Record<Poll["type"], string> = {
  multiple_choice: "📊", temperature: "🌡️", qa: "❓",
  like_dislike: "👍", word_cloud: "☁️", emoji_cloud: "😊", planning_poker: "🃏",
  idea_wall: "💡",
};

const EDIT_WINDOW_MS = 10 * 60 * 1000;

// ─── PollResults ─────────────────────────────────────────────────────────────

function PollResults({ poll, valueCounts, total }: { poll: PollRow; valueCounts: Record<string, number>; total: number }) {
  if (total === 0) return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">Голосов нет</p>;

  if (poll.type === "qa") return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">Вопросов получено: {total}</p>;

  if (poll.type === "temperature") {
    const avg = (Object.entries(valueCounts).reduce((s, [v, c]) => s + parseFloat(v) * c, 0) / total).toFixed(1);
    return (
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(parseFloat(avg) / 5) * 100}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">{avg} / 5</span>
      </div>
    );
  }

  if (poll.type === "word_cloud") {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([word, count]) => (
          <span key={word} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-300">
            {word}<span className="font-semibold">{count}</span>
          </span>
        ))}
      </div>
    );
  }

  if (poll.type === "emoji_cloud") {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).map(([emoji, count]) => (
          <span key={emoji} className="flex items-center gap-1 text-sm">
            {emoji}<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{count}</span>
          </span>
        ))}
      </div>
    );
  }

  if (poll.type === "like_dislike") {
    const likes = valueCounts["like"] ?? 0;
    const dislikes = valueCounts["dislike"] ?? 0;
    const pct = total > 0 ? Math.round((likes / total) * 100) : 0;
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="text-green-500">👍 {likes}</span>
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-red-400">👎 {dislikes}</span>
      </div>
    );
  }

  const sorted = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div className="mt-2 space-y-1">
      {sorted.map(([opt, count]) => (
        <div key={opt} className="flex items-center gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{opt}</span>
          <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(count / total) * 100}%` }} />
          </div>
          <span className="text-slate-400 dark:text-slate-600 shrink-0 w-6 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PollCard ─────────────────────────────────────────────────────────────────

function PollCard({
  poll, votesByPoll, votesDataByPoll, sessionId, orgSlug, sessionStatus, copyTargets,
  draggingId, onDragStart, onDragEnd,
  editingId, editTitle, editOptions, editSaving, editError,
  onStartEdit, onSaveEdit, onCancelEdit, onEditTitleChange, onEditOptionsChange,
  hiddenFromDisplay, onHide, onShow, otherActivePollTitle,
}: {
  poll: PollRow;
  votesByPoll: Record<string, number>;
  votesDataByPoll: Record<string, Record<string, number>>;
  sessionId: string; orgSlug: string; sessionStatus: SessionStatus; copyTargets: CopyTarget[];
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  editingId: string | null; editTitle: string; editOptions: string; editSaving: boolean; editError: string | null;
  onStartEdit: (p: PollRow) => void; onSaveEdit: (p: PollRow) => void; onCancelEdit: () => void;
  onEditTitleChange: (v: string) => void; onEditOptionsChange: (v: string) => void;
  hiddenFromDisplay: boolean;
  onHide: () => void;
  onShow: () => void;
  otherActivePollTitle?: string;
}) {
  const isActive    = poll.status === "active";
  const isClosed    = poll.status === "closed";
  const isEnded     = sessionStatus === "ended";
  const voteCount   = votesByPoll[poll.id] ?? 0;
  const valueCounts = votesDataByPoll[poll.id] ?? {};
  const showResults = isEnded || isClosed;
  const isEditing   = editingId === poll.id;
  const isDragging  = draggingId === poll.id;
  const canEdit     = !isEnded && Date.now() - new Date(poll.created_at).getTime() < EDIT_WINDOW_MS;

  return (
    <div
      draggable={!isEnded && !isEditing}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(poll.id); }}
      onDragEnd={onDragEnd}
      className={`rounded-xl border px-4 py-3.5 transition-[border-color,box-shadow,opacity] duration-150 select-none
        ${!isEnded && !isEditing ? "cursor-grab active:cursor-grabbing" : ""}
        ${isDragging ? "opacity-30 scale-95" : ""}
        ${isActive ? "border-green-500/40 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.05)]"
          : isClosed && !isEnded ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}
    >
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <input value={editTitle} onChange={e => onEditTitleChange(e.target.value)} autoFocus
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Вопрос"
          />
          {poll.type === "multiple_choice" && (
            <textarea value={editOptions} onChange={e => onEditOptionsChange(e.target.value)} rows={3}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder={"Вариант А\nВариант Б"}
            />
          )}
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <div className="flex gap-2">
            <Button className="text-xs py-1.5 px-3" loading={editSaving} onClick={() => onSaveEdit(poll)}>Сохранить</Button>
            <Button variant="ghost" className="text-xs py-1.5 px-3" onClick={onCancelEdit}>Отмена</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {/* drag handle */}
            {!isEnded && (
              <span className="text-slate-300 dark:text-slate-600 text-base leading-none shrink-0 cursor-grab select-none" title="Перетащить в секцию">
                ⠿
              </span>
            )}
            <span className="text-xl shrink-0">{TYPE_ICON[poll.type]}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm truncate ${isClosed && !isEnded ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                {poll.title}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {TYPE_LABEL[poll.type]}
                {voteCount > 0 && <span className="text-slate-300 dark:text-slate-600"> · {voteCount} голосов</span>}
              </p>
            </div>
            {isActive && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Идёт
              </span>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {canEdit && (
                <button onClick={() => onStartEdit(poll)} title="Редактировать (10 мин после создания)"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                ><EditIcon size={13} /></button>
              )}
              {sessionStatus === "active" && (
                <>
                  {!isActive && !isClosed && (
                    <Button
                      className="text-xs py-1.5 px-3"
                      onClick={() => {
                        if (otherActivePollTitle && !confirm(`Запущен опрос «${otherActivePollTitle}» — он будет завершён. Продолжить?`)) return;
                        activatePoll(poll.id, sessionId, orgSlug);
                      }}
                    >Запустить</Button>
                  )}
                  {isActive && hiddenFromDisplay && (
                    <Button className="text-xs py-1.5 px-3" onClick={onShow}>Показать</Button>
                  )}
                  {isActive && !hiddenFromDisplay && (
                    <button type="button" onClick={onHide}
                      className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                      На экране
                    </button>
                  )}
                  {isActive && poll.type === "planning_poker" && (
                    <Button className="text-xs py-1.5 px-3 bg-purple-600 hover:bg-purple-700" onClick={() => revealPoker(sessionId, orgSlug)}>🃏 Раскрыть</Button>
                  )}
                  {isActive && (
                    <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => closePoll(poll.id, sessionId, orgSlug)}>Завершить</Button>
                  )}
                </>
              )}
              {copyTargets.length > 0 && <CopyPollButton pollId={poll.id} orgSlug={orgSlug} targets={copyTargets} />}
            </div>
          </div>
          {showResults && <PollResults poll={poll} valueCounts={valueCounts} total={voteCount} />}
        </>
      )}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  section, orgSlug, sessionId, isPending,
}: {
  section: SectionItem; orgSlug: string; sessionId: string; isPending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [, startT] = useTransition();

  function save() {
    if (!title.trim() || title.trim() === section.title) { setEditing(false); return; }
    startT(async () => {
      await renameSection(section.id, title, sessionId, orgSlug);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`Удалить секцию «${section.title}»? Опросы останутся, но потеряют привязку.`)) return;
    startT(async () => { await deleteSection(section.id, sessionId, orgSlug); });
  }

  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      {editing ? (
        <>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setTitle(section.title); setEditing(false); } }}
            autoFocus
            className="flex-1 min-w-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button type="button" onClick={save} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">✓</button>
          <button type="button" onClick={() => { setTitle(section.title); setEditing(false); }} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">✕</button>
        </>
      ) : (
        <>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
            {section.title}
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <button type="button" onClick={() => setEditing(true)} title="Переименовать"
            className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 px-0.5 shrink-0 transition-colors"
          ><EditIcon size={12} /></button>
          <button type="button" onClick={handleDelete} disabled={isPending} title="Удалить секцию"
            className="text-[11px] text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 px-0.5 shrink-0 transition-colors disabled:opacity-40"
          >✕</button>
        </>
      )}
    </div>
  );
}

// ─── AddSectionBar ────────────────────────────────────────────────────────────

function AddSectionBar({
  sessionId, orgSlug, sectionsCount,
}: {
  sessionId: string; orgSlug: string; sectionsCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startT] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  function addOne(name: string) {
    if (!name.trim()) return;
    startT(async () => {
      await createSection(sessionId, name.trim(), orgSlug);
      setTitle("");
      setOpen(false);
    });
  }

  function addDays(count: number) {
    startT(async () => {
      for (let i = 1; i <= count; i++) {
        await createSection(sessionId, `День ${sectionsCount + i}`, orgSlug);
      }
      setOpen(false);
    });
  }

  return (
    <div className="mb-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors group"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 group-hover:border-indigo-400 group-hover:text-indigo-500 transition-colors text-[10px] font-bold">＋</span>
          Добавить секцию
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-3">
          {/* quick day presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 shrink-0">Быстро:</span>
            {[1, 2, 3, 5].map(n => (
              <button key={n} type="button" disabled={isPending} onClick={() => addDays(n)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-40"
              >
                {n === 1 ? "День" : `${n} дня`}
              </button>
            ))}
          </div>

          {/* custom name */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addOne(title); if (e.key === "Escape") setOpen(false); }}
              placeholder="Название секции..."
              className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="button" onClick={() => addOne(title)} disabled={!title.trim() || isPending}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 text-sm font-medium transition-colors shrink-0"
            >
              {isPending ? "…" : "＋"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PollList ─────────────────────────────────────────────────────────────────

export function PollList({
  polls,
  slides,
  activeSlideId,
  votesByPoll,
  votesDataByPoll,
  sessionId,
  orgSlug,
  sessionStatus,
  copyTargets,
  sections: initialSections,
}: {
  polls: PollRow[];
  slides: SlideRow[];
  activeSlideId: string | null;
  votesByPoll: Record<string, number>;
  votesDataByPoll: Record<string, Record<string, number>>;
  sessionId: string; orgSlug: string; sessionStatus: SessionStatus;
  copyTargets: CopyTarget[];
  sections: SectionItem[];
}) {
  const [hiddenPollIds, setHiddenPollIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = sessionStorage.getItem(`hidden-polls-${sessionId}`);
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`hidden-polls-${sessionId}`, JSON.stringify([...hiddenPollIds]));
    } catch {}
  }, [hiddenPollIds, sessionId]);

  // Poll editing state
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editTitle, setEditTitle]     = useState("");
  const [editOptions, setEditOptions] = useState("");
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState<string | null>(null);

  // Poll DnD state
  const [draggingId, setDraggingId]       = useState<string | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | "none" | null>(null);
  const [isPending, startTransition]      = useTransition();

  // Slide DnD state
  const router = useRouter();
  const [draggingSlideId, setDraggingSlideId] = useState<string | null>(null);
  const [overSlideId, setOverSlideId]         = useState<string | null>(null);
  const [overSlideSection, setOverSlideSection] = useState<string | "none" | null>(null);
  const [optimisticSlides, setOptimisticSlides] = useState(slides);

  // Sync when server data changes
  useEffect(() => { setOptimisticSlides(slides); }, [slides]);

  // Optimistic poll section assignments
  const [optimisticPolls, applyMove] = useOptimistic(
    polls,
    (prev, { pollId, sectionId }: { pollId: string; sectionId: string | null }) =>
      prev.map(p => p.id === pollId ? { ...p, section_id: sectionId } : p)
  );

  function startEdit(poll: PollRow) {
    setEditingId(poll.id);
    setEditTitle(poll.title);
    setEditOptions((poll.options as string[]).join("\n"));
    setEditError(null);
  }

  async function saveEdit(poll: PollRow) {
    setEditSaving(true);
    setEditError(null);
    const options = editOptions.split("\n").map(o => o.trim()).filter(Boolean);
    const result = await updatePoll(poll.id, editTitle, options, sessionId, orgSlug);
    setEditSaving(false);
    if ("error" in result) setEditError(result.error);
    else setEditingId(null);
  }

  function handleSlideToSection(slideId: string, sectionId: string | null) {
    const slide = optimisticSlides.find(s => s.id === slideId);
    setDraggingSlideId(null);
    setOverSlideSection(null);
    if (!slide || slide.section_id === sectionId) return;
    setOptimisticSlides(prev => prev.map(s => s.id === slideId ? { ...s, section_id: sectionId } : s));
    moveSlideToSection(slideId, sessionId, sectionId, orgSlug).then(() => router.refresh());
  }

  function handleDrop(targetSectionId: string | null) {
    if (!draggingId) return;
    const poll = optimisticPolls.find(p => p.id === draggingId);
    const id = draggingId;
    setDraggingId(null);
    setOverSectionId(null);
    if (poll?.section_id === targetSectionId) return;
    startTransition(() => {
      applyMove({ pollId: id, sectionId: targetSectionId });
      movePollSection(id, targetSectionId, sessionId, orgSlug);
    });
  }

  function handleHidePoll(pollId: string) {
    setHiddenPollIds(prev => new Set([...prev, pollId]));
    hidePollFromDisplay(sessionId, orgSlug);
  }

  function handleShowPoll(pollId: string) {
    setHiddenPollIds(prev => { const next = new Set(prev); next.delete(pollId); return next; });
    showPollOnDisplay(pollId, sessionId, orgSlug);
  }

  const baseCardProps = {
    votesByPoll, votesDataByPoll, sessionId, orgSlug, sessionStatus, copyTargets,
    draggingId, onDragStart: (id: string) => { setDraggingId(id); setHiddenPollIds(new Set()); },
    onDragEnd: () => { setDraggingId(null); setOverSectionId(null); },
    editingId, editTitle, editOptions, editSaving, editError,
    onStartEdit: startEdit, onSaveEdit: saveEdit, onCancelEdit: () => setEditingId(null),
    onEditTitleChange: setEditTitle, onEditOptionsChange: setEditOptions,
  };

  const activePoll = optimisticPolls.find(p => p.status === "active");

  function renderPollCard(poll: PollRow) {
    return (
      <PollCard
        key={poll.id}
        poll={poll}
        {...baseCardProps}
        hiddenFromDisplay={hiddenPollIds.has(poll.id)}
        onHide={() => handleHidePoll(poll.id)}
        onShow={() => handleShowPoll(poll.id)}
        otherActivePollTitle={poll.status !== "active" && activePoll ? activePoll.title : undefined}
      />
    );
  }

  const sorted = [...initialSections].sort((a, b) => a.sort_order - b.sort_order);

  // shared drop zone wrapper
  function SectionDropZone({ sectionId, polls: zonePolls }: { sectionId: string | null; polls: PollRow[] }) {
    const key = sectionId ?? "none";
    const isOver = draggingId !== null && overSectionId === key;

    return (
      <div
        onDragOver={e => { e.preventDefault(); setOverSectionId(sectionId ?? "none"); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(sectionId); }}
        className={`rounded-xl transition-[box-shadow,background-color] duration-150 ${isOver ? "ring-2 ring-indigo-400 ring-inset bg-indigo-50/60 dark:bg-indigo-500/10" : ""}`}
      >
        {zonePolls.length === 0 ? (
          <div className={`rounded-xl border-2 border-dashed py-6 text-center transition-colors ${
            isOver ? "border-indigo-400 text-indigo-500 dark:text-indigo-400" : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
          }`}>
            <p className="text-xs font-medium">{isOver ? "Перенести сюда" : "Нет опросов"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {zonePolls.map(poll => renderPollCard(poll))}
            {isOver && (
              <div className="rounded-xl border-2 border-dashed border-indigo-400 py-3 text-center text-xs text-indigo-500 font-medium">
                Перенести сюда
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const hasAnything = optimisticPolls.length > 0 || sorted.length > 0 || slides.length > 0;

  if (!hasAnything) {
    return (
      <>
        {sessionStatus !== "ended" && (
          <AddSectionBar sessionId={sessionId} orgSlug={orgSlug} sectionsCount={0} />
        )}
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">Лайн-ап пуст</p>
          <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">Добавьте опрос или экран справа</p>
        </div>
      </>
    );
  }

  const unsectioned = optimisticPolls.filter(p => p.section_id === null);
  const globalSlides = optimisticSlides.filter(s => s.section_id === null).sort((a, b) => a.sort_order - b.sort_order);

  function renderSlideGroup(slideList: SlideRow[]) {
    return slideList.map((slide) => (
      <div
        key={slide.id}
        onDragOver={(e) => {
          if (!draggingSlideId) return; // ignore poll drags — let them fall through to section container
          e.preventDefault(); setOverSlideId(slide.id);
        }}
        onDrop={(e) => {
          if (!draggingSlideId) return; // ignore poll drags
          e.preventDefault();
          if (draggingSlideId === slide.id) {
            setDraggingSlideId(null); setOverSlideId(null); return;
          }
          const next = [...optimisticSlides];
          const fromIdx = next.findIndex(s => s.id === draggingSlideId);
          const toIdx   = next.findIndex(s => s.id === slide.id);
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          setOptimisticSlides(next);
          setDraggingSlideId(null);
          setOverSlideId(null);
          reorderSlides(sessionId, next.map(s => s.id), orgSlug).then(() => router.refresh());
        }}
        className={`rounded-xl transition-[box-shadow,background-color] duration-150 ${
          overSlideId === slide.id && draggingSlideId && draggingSlideId !== slide.id
            ? "ring-2 ring-purple-400 ring-inset" : ""
        }`}
      >
        <SlideLineupCard
          slide={slide}
          isActive={activeSlideId === slide.id}
          sessionId={sessionId}
          orgSlug={orgSlug}
          isDragging={draggingSlideId === slide.id}
          onDragStart={() => setDraggingSlideId(slide.id)}
          onDragEnd={() => { setDraggingSlideId(null); setOverSlideId(null); }}
          sections={sorted}
        />
      </div>
    ));
  }

  return (
    <div className="flex flex-col gap-5">
      {sessionStatus !== "ended" && (
        <AddSectionBar sessionId={sessionId} orgSlug={orgSlug} sectionsCount={sorted.length} />
      )}

      {/* Global slides (no section) */}
      {globalSlides.length > 0 && (
        <div className="flex flex-col gap-2">
          {renderSlideGroup(globalSlides)}
          {optimisticPolls.length > 0 && sorted.length === 0 && (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-wider font-medium shrink-0">Опросы</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>
          )}
        </div>
      )}

      {/* Sections: their slides + their polls */}
      {sorted.map(section => {
        const sectionPolls = optimisticPolls.filter(p => p.section_id === section.id);
        const sectionSlides = optimisticSlides.filter(s => s.section_id === section.id).sort((a, b) => a.sort_order - b.sort_order);
        const isSlideOver = draggingSlideId !== null && overSlideSection === section.id;
        const isPollOver = draggingId !== null && overSectionId === section.id;
        return (
          <div
            key={section.id}
            onDragOver={e => { if (draggingId) { e.preventDefault(); setOverSectionId(section.id); } }}
            onDrop={e => { if (draggingId) { e.preventDefault(); handleDrop(section.id); } }}
            className={`rounded-xl transition-[box-shadow,background-color] duration-150 -mx-1 px-1 py-0.5 ${
              isPollOver ? "ring-2 ring-indigo-400 ring-inset bg-indigo-50/40 dark:bg-indigo-500/10" : ""
            }`}
          >
            <SectionHeader section={section} orgSlug={orgSlug} sessionId={sessionId} isPending={isPending} />
            {/* Slide drop zone for this section — visible only while dragging a slide */}
            {draggingSlideId && (
              <div
                onDragOver={e => { e.preventDefault(); setOverSlideSection(section.id); }}
                onDrop={e => { e.preventDefault(); handleSlideToSection(draggingSlideId, section.id); }}
                className={`rounded-xl border-2 border-dashed mb-2 py-3 text-center text-xs font-medium transition-colors ${
                  isSlideOver
                    ? "border-purple-400 bg-purple-50/30 dark:bg-purple-900/10 text-purple-500"
                    : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
                }`}
              >
                {isSlideOver ? "Перенести экран сюда" : `Экран → ${section.title}`}
              </div>
            )}
            {sectionSlides.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {renderSlideGroup(sectionSlides)}
              </div>
            )}
            <SectionDropZone sectionId={section.id} polls={sectionPolls} />
          </div>
        );
      })}

      {sorted.length === 0 ? (
        <div className="flex flex-col gap-2">
          {optimisticPolls.map(poll => renderPollCard(poll))}
        </div>
      ) : (
        <>
          {/* "Без секции" drop for slides — visible while dragging a slide that's in a section */}
          {draggingSlideId && optimisticSlides.find(s => s.id === draggingSlideId)?.section_id !== null && (
            <div
              onDragOver={e => { e.preventDefault(); setOverSlideSection("none"); }}
              onDrop={e => { e.preventDefault(); handleSlideToSection(draggingSlideId, null); }}
              className={`rounded-xl border-2 border-dashed py-3 text-center text-xs font-medium transition-colors ${
                overSlideSection === "none"
                  ? "border-purple-400 bg-purple-50/30 dark:bg-purple-900/10 text-purple-500"
                  : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
              }`}
            >
              {overSlideSection === "none" ? "Убрать из секции" : "Экран → Без секции"}
            </div>
          )}
          {(unsectioned.length > 0 || draggingId) && (
            <div>
              <div className="flex items-center gap-3 mb-2 px-1">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wide whitespace-nowrap">Без секции</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <SectionDropZone sectionId={null} polls={unsectioned} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
