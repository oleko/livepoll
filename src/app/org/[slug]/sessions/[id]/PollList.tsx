"use client";

import { useState, useTransition, useEffect, useRef, useOptimistic } from "react";
import { activatePoll, closePoll, copyPoll, updatePoll } from "@/lib/actions/polls";
import { movePollSection, createSection, deleteSection, renameSection } from "@/lib/actions/sections";
import { Button } from "@/components/ui/Button";
import type { Poll, SessionStatus } from "@/types/database";

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
};

const TYPE_ICON: Record<Poll["type"], string> = {
  multiple_choice: "📊", temperature: "🌡️", qa: "❓",
  like_dislike: "👍", word_cloud: "☁️", emoji_cloud: "😊", planning_poker: "🃏",
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
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(parseFloat(avg) / 10) * 100}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">{avg} / 10</span>
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
      className={`rounded-xl border px-4 py-3.5 transition-all select-none
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
                  className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs"
                >✏</button>
              )}
              {sessionStatus === "active" && (
                <>
                  {!isActive && !isClosed && (
                    <Button className="text-xs py-1.5 px-3" onClick={() => activatePoll(poll.id, sessionId, orgSlug)}>Запустить</Button>
                  )}
                  {isActive && (
                    <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => closePoll(poll.id, sessionId, orgSlug)}>Остановить</Button>
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
            className="text-[11px] text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 px-0.5 shrink-0 transition-colors"
          >✏</button>
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
  votesByPoll,
  votesDataByPoll,
  sessionId,
  orgSlug,
  sessionStatus,
  copyTargets,
  sections: initialSections,
}: {
  polls: PollRow[];
  votesByPoll: Record<string, number>;
  votesDataByPoll: Record<string, Record<string, number>>;
  sessionId: string; orgSlug: string; sessionStatus: SessionStatus;
  copyTargets: CopyTarget[];
  sections: SectionItem[];
}) {
  // Poll editing state
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editTitle, setEditTitle]     = useState("");
  const [editOptions, setEditOptions] = useState("");
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState<string | null>(null);

  // DnD state
  const [draggingId, setDraggingId]       = useState<string | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | "none" | null>(null);
  const [isPending, startTransition]      = useTransition();

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

  const cardProps = {
    votesByPoll, votesDataByPoll, sessionId, orgSlug, sessionStatus, copyTargets,
    draggingId, onDragStart: setDraggingId, onDragEnd: () => { setDraggingId(null); setOverSectionId(null); },
    editingId, editTitle, editOptions, editSaving, editError,
    onStartEdit: startEdit, onSaveEdit: saveEdit, onCancelEdit: () => setEditingId(null),
    onEditTitleChange: setEditTitle, onEditOptionsChange: setEditOptions,
  };

  const sorted = [...initialSections].sort((a, b) => a.sort_order - b.sort_order);

  // shared drop zone wrapper
  function SectionDropZone({ sectionId, polls: zonePolls }: { sectionId: string | null; polls: PollRow[] }) {
    const key = sectionId ?? "none";
    const isOver = draggingId !== null && overSectionId === key;

    return (
      <div
        onDragOver={e => { e.preventDefault(); setOverSectionId(sectionId ?? "none"); }}
        onDrop={e => { e.preventDefault(); handleDrop(sectionId); }}
        className={`rounded-xl transition-all ${isOver ? "ring-2 ring-indigo-400 ring-inset bg-indigo-50/60 dark:bg-indigo-500/10" : ""}`}
      >
        {zonePolls.length === 0 ? (
          <div className={`rounded-xl border-2 border-dashed py-6 text-center transition-colors ${
            isOver ? "border-indigo-400 text-indigo-500 dark:text-indigo-400" : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
          }`}>
            <p className="text-xs font-medium">{isOver ? "Перенести сюда" : "Нет опросов"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {zonePolls.map(poll => <PollCard key={poll.id} poll={poll} {...cardProps} />)}
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

  if (optimisticPolls.length === 0 && sorted.length === 0) {
    return (
      <>
        {sessionStatus !== "ended" && (
          <AddSectionBar sessionId={sessionId} orgSlug={orgSlug} sectionsCount={0} />
        )}
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">Нет опросов</p>
          <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">Добавьте первый опрос справа</p>
        </div>
      </>
    );
  }

  const unsectioned = optimisticPolls.filter(p => p.section_id === null);

  return (
    <div className="flex flex-col gap-5">
      {sessionStatus !== "ended" && (
        <AddSectionBar sessionId={sessionId} orgSlug={orgSlug} sectionsCount={sorted.length} />
      )}

      {sorted.map(section => {
        const sectionPolls = optimisticPolls.filter(p => p.section_id === section.id);
        return (
          <div key={section.id}>
            <SectionHeader section={section} orgSlug={orgSlug} sessionId={sessionId} isPending={isPending} />
            <SectionDropZone sectionId={section.id} polls={sectionPolls} />
          </div>
        );
      })}

      {/* Unsectioned polls */}
      {(unsectioned.length > 0 || (draggingId && sorted.length > 0)) && (
        <div>
          {sorted.length > 0 && (
            <div className="flex items-center gap-3 mb-2 px-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wide whitespace-nowrap">
                Без секции
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          )}
          <SectionDropZone sectionId={null} polls={unsectioned} />
        </div>
      )}

      {sorted.length === 0 && (
        <div className="flex flex-col gap-2">
          {optimisticPolls.map(poll => <PollCard key={poll.id} poll={poll} {...cardProps} />)}
        </div>
      )}
    </div>
  );
}
