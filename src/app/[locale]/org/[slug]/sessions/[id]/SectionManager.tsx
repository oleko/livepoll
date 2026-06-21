"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createSection, deleteSection, renameSection, copySection } from "@/lib/actions/sections";

type Section = { id: string; title: string; sort_order: number };
type SessionTarget = { id: string; title: string; status: string };

function CopySectionButton({
  sectionId,
  sessionId,
  orgSlug,
  targets,
}: {
  sectionId: string;
  sessionId: string;
  orgSlug: string;
  targets: SessionTarget[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    const result = await copySection(sectionId, sessionId, targetId, orgSlug);
    setPending(null);
    if ("error" in result) {
      setError(result.error);
      setTimeout(() => setError(null), 4000);
    } else {
      setDone(targetId);
      setTimeout(() => { setDone(null); setOpen(false); }, 1200);
    }
  }

  const allTargets: SessionTarget[] = [
    { id: sessionId, title: "В эту же сессию", status: "current" },
    ...targets,
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Копировать день"
        className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 px-1 shrink-0 transition-colors"
      >
        ⎘
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
            Копировать день в…
          </p>
          {error && (
            <p className="px-3 py-2 text-xs text-red-500 border-b border-slate-100 dark:border-slate-800">{error}</p>
          )}
          {allTargets.map(target => (
            <button
              key={target.id}
              type="button"
              disabled={!!pending}
              onClick={() => handle(target.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{target.title}</span>
              {done === target.id
                ? <span className="text-xs font-semibold text-green-500 shrink-0">✓</span>
                : pending === target.id
                  ? <span className="text-xs text-slate-400 shrink-0">…</span>
                  : target.status === "current"
                    ? null
                    : <span className="text-[11px] text-slate-400 shrink-0">{target.status}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionManager({
  sessionId,
  orgSlug,
  initialSections,
  copyTargets = [],
}: {
  sessionId: string;
  orgSlug: string;
  initialSections: Section[];
  copyTargets?: SessionTarget[];
}) {
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      await createSection(sessionId, newTitle, orgSlug);
      setNewTitle("");
    });
  }

  function handleDelete(sectionId: string) {
    if (!confirm("Удалить секцию? Опросы останутся, но потеряют привязку к секции.")) return;
    startTransition(async () => {
      await deleteSection(sectionId, sessionId, orgSlug);
    });
  }

  function startRename(s: Section) {
    setEditingId(s.id);
    setEditTitle(s.title);
  }

  function handleRename(sectionId: string) {
    startTransition(async () => {
      await renameSection(sectionId, editTitle, sessionId, orgSlug);
      setEditingId(null);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">📂 Секции</h2>

      {initialSections.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {initialSections.map((s) => (
            <div key={s.id} className="flex items-center gap-1 min-w-0">
              {editingId === s.id ? (
                <>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(s.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(s.id)}
                    disabled={isPending}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 shrink-0 px-1"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 px-1"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-300 truncate">
                    {s.title}
                  </span>
                  <CopySectionButton
                    sectionId={s.id}
                    sessionId={sessionId}
                    orgSlug={orgSlug}
                    targets={copyTargets}
                  />
                  <button
                    type="button"
                    onClick={() => startRename(s)}
                    title="Переименовать"
                    className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-1 shrink-0"
                  >
                    ✏
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={isPending}
                    title="Удалить секцию"
                    className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 px-1 shrink-0 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Название секции..."
          className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newTitle.trim() || isPending}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-2 text-sm font-medium transition-colors shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}
