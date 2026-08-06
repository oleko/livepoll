"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { activatePoll, closePoll, clearPollResult, copyPoll, updatePoll, showPollOnDisplay, hidePollFromDisplay, reorderPolls } from "@/lib/actions/polls";
import { useChannel } from "@/core/realtime/useChannel";
import { movePollSection, createSection, deleteSection, renameSection, copySection } from "@/lib/actions/sections";
import { showSlide, hideSlide, deleteSlide, duplicateSlide, updateSlide, reorderSlides, moveSlideToSection } from "@/lib/actions/slides";
import { revealPoker } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/Button";
import { EditIcon } from "@/components/icons";
import { Dialog, DialogRawContent } from "@/components/ui/Dialog";
import { SlideView } from "@/app/[locale]/display/[code]/SlideView";
import { slideRegistry } from "@/core/registry/slides";
import { pollModule } from "@/core/registry/polls";
import { ConfigForm } from "@/core/screens/ConfigForm";
import type { Translator } from "@/core/settings/field";
import type { Poll, SessionStatus } from "@/types/database";
import type { SlideRow } from "@/lib/actions/slides";
import { buildCsvRows } from "@/lib/csv";
import { bucketTimestamps } from "@/lib/timeline";

function downloadPollCSV(poll: PollRow, valueCounts: Record<string, number>, voteCount: number) {
  const rows = buildCsvRows(poll, valueCounts, voteCount);
  const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${poll.title.slice(0, 40).replace(/[<>:"/\\|?*]/g, "").trim() || "poll"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SlideEditor({ slide, orgSlug, onDone, onCancel }: {
  slide: SlideRow;
  orgSlug: string;
  onDone: (content: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations() as unknown as Translator;
  const m = slideRegistry[slide.type];
  const [content, setContent] = useState<Record<string, unknown>>(slide.content);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    await updateSlide(slide.id, content, slide.session_id, orgSlug);
    router.refresh();
    onDone(content);
    setSaving(false);
  }

  const Editor = m.content.Editor;

  return (
    <div className="space-y-2 pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
      {Editor
        ? <Editor value={content} onChange={setContent} t={t} />
        : <ConfigForm fields={m.content.fields ?? []} value={content} onChange={setContent} t={t} />}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-medium transition-colors"
        >{saving ? t("Org.session.pollList.slideEdit.saving") : t("Org.session.pollList.slideEdit.save")}</button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >{t("Org.session.pollList.slideEdit.cancel")}</button>
      </div>
    </div>
  );
}

function SlidePreviewModal({ slide, onClose }: { slide: SlideRow; onClose: () => void }) {
  const t = useTranslations() as unknown as Translator;
  const m = slideRegistry[slide.type];
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogRawContent>
        <div className="relative">
          <div style={{ width: 480, height: 270, overflow: "hidden", borderRadius: 8, position: "relative" }}>
            <div style={{ width: 1440, height: 810, transformOrigin: "top left", transform: "scale(0.3333)", position: "absolute", top: 0, left: 0 }}>
              <SlideView slide={{ id: slide.id, type: slide.type, content: slide.content }} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-slate-700 text-white text-xs flex items-center justify-center hover:bg-slate-600 transition-colors"
          >✕</button>
          <p className="mt-2 text-center text-xs text-slate-400">
            {t(m.meta.labelKey)} — {m.content.preview(slide.content, t)}
          </p>
        </div>
      </DialogRawContent>
    </Dialog>
  );
}

function SlideLineupCard({
  slide, isActive, sessionId, orgSlug, isDragging, onDragStart, onDragEnd, sections,
  onShowSlide, onHideSlide,
}: {
  slide: SlideRow; isActive: boolean; sessionId: string; orgSlug: string;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  sections?: SectionItem[];
  onShowSlide: (slideId: string) => void;
  onHideSlide: () => void;
}) {
  const t = useTranslations("Org.session.pollList");
  const tShared = useTranslations("Org.shared");
  const tRoot = useTranslations() as unknown as Translator;
  const m = slideRegistry[slide.type];
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleShow() {
    onShowSlide(slide.id);
    setPending(true);
    await showSlide(slide.id, sessionId, orgSlug);
    router.refresh();
    setPending(false);
  }

  async function handleHide() {
    onHideSlide();
    setPending(true);
    await hideSlide(sessionId, orgSlug);
    router.refresh();
    setPending(false);
  }

  async function handleDelete() {
    if (!confirm(t("deleteSlideConfirm", { title: m.content.preview(slide.content, tRoot) }))) return;
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
          ? "border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_20px_rgba(168,85,247,0.06)]"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* info row */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-slate-300 dark:text-slate-600 text-base leading-none shrink-0 select-none">⠿</span>
          <span className="text-xl shrink-0">{m.meta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-slate-900 dark:text-white">{m.content.preview(slide.content, tRoot)}</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">{tShared(`slideTypeLabel.${slide.type}`)}</p>
          </div>
          {isActive && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />{t("onScreen")}
            </span>
          )}
        </div>
        {/* actions row */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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
              <option value="">{t("noSection")}</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          )}
          <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} disabled={pending} title={t("previewTitle")}>
            👁
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(v => !v)} disabled={pending} title={t("editTitle")}>
            <EditIcon size={13} />
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} title={t("duplicateTitle")} onClick={async () => {
            setPending(true);
            await duplicateSlide(slide.id, sessionId, orgSlug);
            router.refresh();
            setPending(false);
          }}>⎘</Button>
          {m.hostActions?.filter(a => !a.whenActive || isActive).map((action) => (
            <Button key={action.id} size="sm" className="bg-indigo-600 hover:bg-indigo-500" disabled={pending} onClick={async () => {
              setPending(true);
              await action.run({ slideId: slide.id, sessionId, orgSlug });
              setPending(false);
            }}>{tRoot(action.labelKey)}</Button>
          ))}
          {isActive ? (
            <Button variant="secondary" size="sm" onClick={handleHide} disabled={pending}>{t("hide")}</Button>
          ) : (
            <Button size="sm" onClick={handleShow} disabled={pending}>{t("show")}</Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={pending} className="hover:text-red-500 dark:hover:text-red-400">
            ✕
          </Button>
        </div>
      </div>

      {editing && (
        <SlideEditor slide={slide} orgSlug={orgSlug} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      )}
      {previewOpen && <SlidePreviewModal slide={slide} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

type CopyTarget = { id: string; title: string; status: string };
type SectionItem = { id: string; title: string; sort_order: number };
type PollRow = Pick<Poll, "id" | "title" | "type" | "status" | "sort_order"> & {
  options: unknown[];
  created_at: string;
  section_id: string | null;
  settings?: Record<string, unknown> | null;
};

// ─── CopyPollButton ───────────────────────────────────────────────────────────

function CopyPollButton({
  pollId, orgSlug, sessionId, targets, sections,
}: {
  pollId: string;
  orgSlug: string;
  sessionId: string;
  targets: CopyTarget[];
  sections: SectionItem[];
}) {
  const t = useTranslations("Org.session.pollList");
  const tShared = useTranslations("Org.shared");
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

  async function handle(targetSessionId: string, sectionId?: string | null) {
    const key = sectionId ? `${targetSessionId}:${sectionId}` : targetSessionId;
    setPending(key);
    await copyPoll(pollId, targetSessionId, orgSlug, sectionId ?? null);
    setPending(null);
    setDone(key);
    setTimeout(() => { setDone(null); setOpen(false); }, 1200);
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)} title={t("copyToOtherEvent")}
        className="rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs"
      >⎘</button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t("copyTo")}</p>
          {/* Same session: show sections if any */}
          {sections.length > 0 ? (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] text-slate-400">{t("copyToThisEvent")}</p>
              <button
                type="button"
                disabled={!!pending}
                onClick={() => handle(sessionId, null)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{t("noSection")}</span>
                {done === sessionId ? <span className="text-xs font-semibold text-green-500 shrink-0">✓</span>
                  : pending === sessionId ? <span className="text-xs text-slate-400 shrink-0">…</span> : null}
              </button>
              {sections.map(s => {
                const key = `${sessionId}:${s.id}`;
                return (
                  <button key={s.id} type="button" disabled={!!pending} onClick={() => handle(sessionId, s.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50 pl-5"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">↳ {s.title}</span>
                    {done === key ? <span className="text-xs font-semibold text-green-500 shrink-0">✓</span>
                      : pending === key ? <span className="text-xs text-slate-400 shrink-0">…</span> : null}
                  </button>
                );
              })}
              {targets.length > 0 && <div className="border-t border-slate-100 dark:border-slate-800 mt-1 mb-1" />}
            </>
          ) : (
            <button
              type="button"
              disabled={!!pending}
              onClick={() => handle(sessionId)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{t("copyToThisEvent")}</span>
              {done === sessionId ? <span className="text-xs font-semibold text-green-500 shrink-0">✓</span>
                : pending === sessionId ? <span className="text-xs text-slate-400 shrink-0">…</span> : null}
            </button>
          )}
          {/* Other sessions */}
          {targets.length > 0 && (
            <>
              {targets.length > 0 && sections.length === 0 && <div className="border-t border-slate-100 dark:border-slate-800" />}
              {targets.map(target => (
                <button key={target.id} type="button" disabled={!!pending} onClick={() => handle(target.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{target.title}</span>
                  {done === target.id ? <span className="text-xs font-semibold text-green-500 shrink-0">✓</span>
                    : pending === target.id ? <span className="text-xs text-slate-400 shrink-0">…</span>
                    : <span className="text-[11px] text-slate-400 shrink-0">{tShared(`sessionStatus.${target.status}`)}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<Poll["type"], string> = {
  multiple_choice: "📊", temperature: "🌡️", qa: "❓",
  like_dislike: "👍", word_cloud: "☁️", emoji_cloud: "😊", planning_poker: "🃏",
  idea_wall: "💡",
};

const EDIT_WINDOW_MS = 10 * 60 * 1000;

// ─── PollResults ─────────────────────────────────────────────────────────────

function PollResults({ poll, valueCounts, total }: { poll: PollRow; valueCounts: Record<string, number>; total: number }) {
  const t = useTranslations("Org.session.pollList");
  const tRoot = useTranslations() as unknown as Translator;
  if (total === 0) return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">{t("noVotes")}</p>;

  if (poll.type === "qa") return <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">{t("questionsReceived", { count: total })}</p>;

  const m = pollModule(poll.type);
  if (m) {
    const config = m.config.fromSettings({ options: poll.options, settings: poll.settings ?? {} });
    const agg = { total, counts: valueCounts, buckets: Object.entries(valueCounts).map(([name, count]) => ({ name, count })) };
    return <m.render.hostResult config={config} agg={agg} total={total} t={tRoot} />;
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

function VoteTimeline({ timestamps }: { timestamps: string[] }) {
  const t = useTranslations("Org.session.pollList");
  if (timestamps.length < 3) return null;
  const N = 14;
  const buckets = bucketTimestamps(timestamps, N);
  const max = Math.max(...buckets);
  if (max === 0) return null;
  return (
    <div className="mt-2 flex items-end gap-px h-7" title={t("voteActivityTitle")}>
      {buckets.map((count, i) => (
        <div key={i} className="flex-1 rounded-sm bg-indigo-400/50 dark:bg-indigo-500/40 transition-all"
          style={{ height: count > 0 ? `${Math.max(12, Math.round((count / max) * 100))}%` : "2px", opacity: count > 0 ? 1 : 0.2 }} />
      ))}
    </div>
  );
}

// ─── PollCard ─────────────────────────────────────────────────────────────────

function PollCard({
  poll, votesByPoll, votesDataByPoll, votesTimeline, sessionId, orgSlug, sessionStatus, copyTargets, sections,
  draggingId, onDragStart, onDragEnd,
  editingId, editTitle, editOptions, editSaving, editError,
  onStartEdit, onSaveEdit, onCancelEdit, onEditTitleChange, onEditOptionsChange,
  hiddenFromDisplay, onHide, onShow, otherActivePollTitle,
}: {
  poll: PollRow;
  votesByPoll: Record<string, number>;
  votesDataByPoll: Record<string, Record<string, number>>;
  votesTimeline?: string[];
  sessionId: string; orgSlug: string; sessionStatus: SessionStatus; copyTargets: CopyTarget[]; sections: SectionItem[];
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
  const t = useTranslations("Org.session.pollList");
  const tShared = useTranslations("Org.shared");
  const router = useRouter();
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
            placeholder={t("questionPlaceholder")}
          />
          {poll.type === "multiple_choice" && (
            <textarea value={editOptions} onChange={e => onEditOptionsChange(e.target.value)} rows={3}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder={t("optionsPlaceholderShort")}
            />
          )}
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <div className="flex gap-2">
            <Button size="sm" loading={editSaving} onClick={() => onSaveEdit(poll)}>{t("slideEdit.save")}</Button>
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>{t("slideEdit.cancel")}</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* info row */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {!isEnded && (
                <span className="text-slate-300 dark:text-slate-600 text-base leading-none shrink-0 cursor-grab select-none" title={t("dragToSection")}>
                  ⠿
                </span>
              )}
              <span className="text-xl shrink-0">{TYPE_ICON[poll.type]}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${isClosed && !isEnded ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                  {poll.title}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {tShared(`pollTypeLabel.${poll.type}`)}
                  {voteCount > 0 && <span className="text-slate-300 dark:text-slate-600"> · {t("votesCount", { count: voteCount })}</span>}
                </p>
              </div>
              {isActive && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />{t("active")}
                </span>
              )}
            </div>
            {/* actions row */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => onStartEdit(poll)} title={t("editWindowTitle")}>
                  <EditIcon size={13} />
                </Button>
              )}
              {sessionStatus === "active" && (
                <>
                  {!isActive && !isClosed && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (otherActivePollTitle && !confirm(t("confirmActivateOther", { title: otherActivePollTitle }))) return;
                        await activatePoll(poll.id, sessionId, orgSlug);
                        router.refresh();
                      }}
                    >{t("launch")}</Button>
                  )}
                  {isActive && hiddenFromDisplay && (
                    <Button size="sm" onClick={onShow}>{t("show")}</Button>
                  )}
                  {isActive && !hiddenFromDisplay && (
                    <button type="button" onClick={onHide}
                      className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                      {t("onDisplay")}
                    </button>
                  )}
                  {isActive && poll.type === "planning_poker" && (
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => revealPoker(sessionId, orgSlug)}>{t("revealPoker")}</Button>
                  )}
                  {isActive && (
                    <>
                      <Button size="sm" className="bg-slate-700 hover:bg-slate-600 text-white" onClick={async () => { await closePoll(poll.id, sessionId, orgSlug, true); router.refresh(); }}>{t("finalize")}</Button>
                      <Button variant="secondary" size="sm" onClick={async () => { await closePoll(poll.id, sessionId, orgSlug); router.refresh(); }}>{t("finish")}</Button>
                    </>
                  )}
                </>
              )}
              {isClosed && !!poll.settings?.result_on_display && (
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600" onClick={async () => { await clearPollResult(poll.id, sessionId, orgSlug); router.refresh(); }}>
                  {t("removeFromDisplay")}
                </Button>
              )}
              {isClosed && voteCount > 0 && (
                <Button variant="ghost" size="sm" title={t("downloadCsvTitle")} onClick={() => downloadPollCSV(poll, valueCounts, voteCount)}>
                  {t("downloadCsv")}
                </Button>
              )}
              <CopyPollButton pollId={poll.id} orgSlug={orgSlug} sessionId={sessionId} targets={copyTargets} sections={sections} />
            </div>
          </div>
          {showResults && <PollResults poll={poll} valueCounts={valueCounts} total={voteCount} />}
          {isClosed && votesTimeline && votesTimeline.length >= 3 && (
            <VoteTimeline timestamps={votesTimeline} />
          )}
        </>
      )}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  section, orgSlug, sessionId, isPending, copyTargets, onBeforeDelete,
}: {
  section: SectionItem; orgSlug: string; sessionId: string; isPending: boolean;
  copyTargets?: CopyTarget[];
  onBeforeDelete?: (sectionId: string) => void;
}) {
  const t = useTranslations("Org.session.pollList");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [, startT] = useTransition();
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyPending, setCopyPending] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (copyRef.current && !copyRef.current.contains(e.target as Node)) setCopyOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function save() {
    if (!title.trim() || title.trim() === section.title) { setEditing(false); return; }
    startT(async () => {
      await renameSection(section.id, title, sessionId, orgSlug);
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(t("deleteSectionConfirm", { title: section.title }))) return;
    onBeforeDelete?.(section.id);
    startT(async () => {
      await deleteSection(section.id, sessionId, orgSlug);
      router.refresh();
    });
  }

  async function handleCopy(targetSessionId: string) {
    setCopyPending(targetSessionId);
    setCopyError(null);
    const result = await copySection(section.id, sessionId, targetSessionId, orgSlug);
    setCopyPending(null);
    if ("error" in result) {
      setCopyError(result.error);
      setTimeout(() => setCopyError(null), 4000);
    } else {
      setCopyDone(targetSessionId);
      setTimeout(() => { setCopyDone(null); setCopyOpen(false); if (targetSessionId === sessionId) router.refresh(); }, 1200);
    }
  }

  const allCopyTargets: CopyTarget[] = [
    { id: sessionId, title: t("copySectionToSame"), status: "current" },
    ...(copyTargets ?? []),
  ];

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
          {/* Copy section */}
          <div className="relative shrink-0" ref={copyRef}>
            <button
              type="button"
              onClick={() => setCopyOpen(v => !v)}
              title={t("copySectionTitle")}
              className="text-[11px] text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 px-0.5 shrink-0 transition-colors"
            >⎘</button>
            {copyOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  {t("copySectionTo")}
                </p>
                {copyError && (
                  <p className="px-3 py-2 text-xs text-red-500 border-b border-slate-100 dark:border-slate-800">{copyError}</p>
                )}
                {allCopyTargets.map(target => (
                  <button
                    key={target.id}
                    type="button"
                    disabled={!!copyPending}
                    onClick={() => handleCopy(target.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{target.title}</span>
                    {copyDone === target.id
                      ? <span className="text-xs font-semibold text-green-500 shrink-0">✓</span>
                      : copyPending === target.id
                        ? <span className="text-xs text-slate-400 shrink-0">…</span>
                        : target.status === "current"
                          ? null
                          : <span className="text-[11px] text-slate-400 shrink-0">{target.status}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => setEditing(true)} title={t("renameSectionTitle")}
            className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 px-0.5 shrink-0 transition-colors"
          ><EditIcon size={12} /></button>
          <button type="button" onClick={handleDelete} disabled={isPending} title={t("deleteSectionTitle")}
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
  const t = useTranslations("Org.session.pollList");
  const router = useRouter();
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
      router.refresh();
    });
  }

  function addDays(count: number) {
    startT(async () => {
      for (let i = 1; i <= count; i++) {
        await createSection(sessionId, t("daySectionName", { n: sectionsCount + i }), orgSlug);
      }
      setOpen(false);
      router.refresh();
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
          {t("addSection")}
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-3">
          {/* quick day presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 shrink-0">{t("quickLabel")}</span>
            {[1, 2, 3, 5].map(n => (
              <button key={n} type="button" disabled={isPending} onClick={() => addDays(n)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-40"
              >
                {n === 1 ? t("dayOne") : t("dayN", { n })}
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
              placeholder={t("sectionNamePlaceholder")}
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
  votesTimelineByPoll,
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
  votesTimelineByPoll?: Record<string, string[]>;
  sessionId: string; orgSlug: string; sessionStatus: SessionStatus;
  copyTargets: CopyTarget[];
  sections: SectionItem[];
}) {
  const t = useTranslations("Org.session.pollList");
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
  const [optimisticActiveSlideId, setOptimisticActiveSlideId] = useState(activeSlideId);

  // Sync when server data changes
  useEffect(() => { setOptimisticSlides(slides); }, [slides]);
  useEffect(() => { setOptimisticActiveSlideId(activeSlideId); }, [activeSlideId]);

  // Optimistic poll state
  const [optimisticPolls, setOptimisticPolls] = useState(polls);
  const [overPollId, setOverPollId] = useState<string | null>(null);
  useEffect(() => { setOptimisticPolls(polls); }, [polls]);

  // Optimistic sections state
  const [optimisticSections, setOptimisticSections] = useState(initialSections);
  useEffect(() => { setOptimisticSections(initialSections); }, [initialSections]);

  // Realtime: refresh vote counts when active poll receives votes
  const activePollId = optimisticPolls.find(p => p.status === "active")?.id ?? null;
  const voteRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (voteRefreshTimer.current) clearTimeout(voteRefreshTimer.current); };
  }, []);
  useChannel("pollVotes", activePollId, {
    vote: () => {
      if (voteRefreshTimer.current) clearTimeout(voteRefreshTimer.current);
      voteRefreshTimer.current = setTimeout(() => router.refresh(), 800);
    },
    revote: () => {
      if (voteRefreshTimer.current) clearTimeout(voteRefreshTimer.current);
      voteRefreshTimer.current = setTimeout(() => router.refresh(), 800);
    },
  });

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
    setOverPollId(null);
    if (poll?.section_id === targetSectionId) return;
    setOptimisticPolls(prev => prev.map(p => p.id === id ? { ...p, section_id: targetSectionId } : p));
    movePollSection(id, targetSectionId, sessionId, orgSlug).then(() => router.refresh());
  }

  function handleReorder(draggingPollId: string, targetPollId: string) {
    setDraggingId(null);
    setOverSectionId(null);
    setOverPollId(null);
    const next = [...optimisticPolls];
    const fromIdx = next.findIndex(p => p.id === draggingPollId);
    const toIdx   = next.findIndex(p => p.id === targetPollId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setOptimisticPolls(next);
    reorderPolls(sessionId, next.map(p => p.id), orgSlug).then(() => router.refresh());
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
    votesByPoll, votesDataByPoll, sessionId, orgSlug, sessionStatus, copyTargets, sections: optimisticSections,
    draggingId, onDragStart: (id: string) => { setDraggingId(id); },
    onDragEnd: () => { setDraggingId(null); setOverSectionId(null); setOverPollId(null); },
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
        votesTimeline={votesTimelineByPoll?.[poll.id]}
        hiddenFromDisplay={hiddenPollIds.has(poll.id)}
        onHide={() => handleHidePoll(poll.id)}
        onShow={() => handleShowPoll(poll.id)}
        otherActivePollTitle={poll.status !== "active" && activePoll ? activePoll.title : undefined}
      />
    );
  }

  const sorted = [...optimisticSections].sort((a, b) => a.sort_order - b.sort_order);

  // render function (NOT a component) — avoids remounting on every re-render during drag
  function renderPollZone(sectionId: string | null, zonePolls: PollRow[]) {
    if (zonePolls.length === 0) {
      return (
        <div className="rounded-xl border-2 border-dashed py-6 text-center border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600">
          <p className="text-xs font-medium">{t("noPolls")}</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {zonePolls.map(poll => {
          const isSameSection = optimisticPolls.find(p => p.id === draggingId)?.section_id === sectionId;
          return (
            <div
              key={poll.id}
              onDragOver={e => {
                if (!draggingId || draggingId === poll.id || !isSameSection) return;
                e.preventDefault();
                e.stopPropagation();
                setOverPollId(poll.id);
              }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setOverPollId(prev => prev === poll.id ? null : prev);
              }}
              onDrop={e => {
                if (!draggingId || draggingId === poll.id || !isSameSection) return;
                e.preventDefault();
                e.stopPropagation();
                handleReorder(draggingId, poll.id);
              }}
              className={`rounded-xl transition-[box-shadow] duration-100 ${
                overPollId === poll.id && isSameSection ? "ring-2 ring-indigo-400 ring-inset" : ""
              }`}
            >
              {renderPollCard(poll)}
            </div>
          );
        })}
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
          <p className="text-slate-500 dark:text-slate-400">{t("lineupEmptyTitle")}</p>
          <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">{t("lineupEmptyDesc")}</p>
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
            ? "ring-2 ring-indigo-400 ring-inset" : ""
        }`}
      >
        <SlideLineupCard
          slide={slide}
          isActive={optimisticActiveSlideId === slide.id}
          sessionId={sessionId}
          orgSlug={orgSlug}
          isDragging={draggingSlideId === slide.id}
          onDragStart={() => setDraggingSlideId(slide.id)}
          onDragEnd={() => { setDraggingSlideId(null); setOverSlideId(null); }}
          sections={sorted}
          onShowSlide={id => setOptimisticActiveSlideId(id)}
          onHideSlide={() => setOptimisticActiveSlideId(null)}
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
              <span className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-wider font-medium shrink-0">{t("pollsDivider")}</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>
          )}
        </div>
      )}

      {/* "Без секции" drop zones — shown at top when dragging out of a section */}
      {sorted.length > 0 && draggingSlideId && optimisticSlides.find(s => s.id === draggingSlideId)?.section_id !== null && (
        <div
          onDragOver={e => { e.preventDefault(); setOverSlideSection("none"); }}
          onDrop={e => { e.preventDefault(); handleSlideToSection(draggingSlideId, null); }}
          className={`rounded-xl border-2 border-dashed py-3 text-center text-xs font-medium transition-colors ${
            overSlideSection === "none"
              ? "border-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10 text-indigo-500"
              : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
          }`}
        >
          {overSlideSection === "none" ? t("removeFromSection") : t("slideToNoSection")}
        </div>
      )}
      {sorted.length > 0 && draggingId && optimisticPolls.find(p => p.id === draggingId)?.section_id !== null && (
        <div
          onDragOver={e => { e.preventDefault(); setOverSectionId("none"); }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(null); }}
          className={`rounded-xl border-2 border-dashed py-3 text-center text-xs font-medium transition-colors ${
            overSectionId === "none"
              ? "border-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10 text-indigo-500"
              : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
          }`}
        >
          {overSectionId === "none" ? t("removeFromSection") : t("pollToNoSection")}
        </div>
      )}

      {/* Sections: entire container is the drop zone */}
      {sorted.map(section => {
        const sectionPolls = optimisticPolls.filter(p => p.section_id === section.id);
        const sectionSlides = optimisticSlides.filter(s => s.section_id === section.id).sort((a, b) => a.sort_order - b.sort_order);
        const isSlideOver = draggingSlideId !== null && overSlideSection === section.id;
        const isPollDropping = draggingId !== null && overSectionId === section.id;
        const isDragFromOtherSection = draggingId !== null && optimisticPolls.find(p => p.id === draggingId)?.section_id !== section.id;
        return (
          <div
            key={section.id}
            className={`rounded-xl -mx-1 px-1 py-0.5 transition-[box-shadow] ${
              isPollDropping ? "ring-2 ring-indigo-400 ring-inset" :
              isSlideOver   ? "ring-2 ring-indigo-400 ring-inset" : ""
            }`}
            onDragOver={e => {
              if (draggingId && isDragFromOtherSection) { e.preventDefault(); setOverSectionId(section.id); }
              else if (draggingSlideId) { e.preventDefault(); setOverSlideSection(section.id); }
            }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                if (overSectionId === section.id) setOverSectionId(null);
                if (overSlideSection === section.id) setOverSlideSection(null);
              }
            }}
            onDrop={e => {
              if (e.defaultPrevented) return;
              if (draggingId && isDragFromOtherSection) { e.preventDefault(); e.stopPropagation(); handleDrop(section.id); }
              else if (draggingSlideId) { e.preventDefault(); handleSlideToSection(draggingSlideId, section.id); }
            }}
          >
            <SectionHeader
              section={section} orgSlug={orgSlug} sessionId={sessionId} isPending={isPending}
              copyTargets={copyTargets}
              onBeforeDelete={(sectionId) => {
                setOptimisticSections(prev => prev.filter(s => s.id !== sectionId));
                setOptimisticPolls(prev => prev.map(p => p.section_id === sectionId ? { ...p, section_id: null } : p));
                setOptimisticSlides(prev => prev.map(s => s.section_id === sectionId ? { ...s, section_id: null } : s));
              }}
            />
            {sectionSlides.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {renderSlideGroup(sectionSlides)}
              </div>
            )}
            {renderPollZone(section.id, sectionPolls)}
          </div>
        );
      })}

      {sorted.length === 0 ? (
        renderPollZone(null, optimisticPolls)
      ) : (
        <>
          {(unsectioned.length > 0 || draggingId) && (
            <div>
              <div className="flex items-center gap-3 mb-2 px-1">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wide whitespace-nowrap">{t("noSectionDivider")}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              {renderPollZone(null, unsectioned)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
