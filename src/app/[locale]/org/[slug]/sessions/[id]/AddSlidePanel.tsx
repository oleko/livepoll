"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSlide } from "@/lib/actions/slides";
import type { SlideType } from "@/lib/actions/slides";
import { slideRegistry, slideTypesInOrder } from "@/core/registry/slides";
import { ConfigForm } from "@/core/screens/ConfigForm";
import type { Translator } from "@/core/settings/field";

export function AddSlidePanel({ sessionId, orgSlug, bare = false, allowedTypes }: {
  sessionId: string; orgSlug: string; bare?: boolean;
  /** Restricts the type picker (e.g. quiz mode: only reveal/splash/announcement). Defaults to all 8 types. */
  allowedTypes?: readonly SlideType[];
}) {
  const t = useTranslations("Org.session.addSlidePanel");
  const tShared = useTranslations("Org.shared");
  const tRoot = useTranslations() as unknown as Translator;
  const router = useRouter();
  const availableTypes = allowedTypes ? slideTypesInOrder.filter((st) => allowedTypes.includes(st)) : slideTypesInOrder;
  const [type, setType] = useState<SlideType>(availableTypes[0] ?? "splash");
  const [content, setContent] = useState<Record<string, unknown>>(() => slideRegistry[availableTypes[0] ?? "splash"].content.defaults());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const m = slideRegistry[type];
  const Editor = m.content.Editor;

  async function save() {
    setError(null);
    if (type === "schedule" && !(content.items as unknown[] | undefined)?.length) {
      setError(t("emptyScheduleError"));
      return;
    }
    setSaving(true);
    try {
      const result = await createSlide(sessionId, type, content, orgSlug);
      if ("error" in result) setError(result.error);
      else { setContent(m.content.defaults()); router.refresh(); }
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
        {availableTypes.map((st) => (
          <button key={st} type="button" onClick={() => { setType(st); setContent(slideRegistry[st].content.defaults()); setError(null); }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              type === st
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700"
            }`}
          >
            <span className="shrink-0">{slideRegistry[st].meta.icon}</span>
            {tShared(`slideTypeLabel.${st}`)}
          </button>
        ))}
      </div>

      {/* Content form */}
      {Editor
        ? <Editor value={content} onChange={setContent} t={tRoot} />
        : <ConfigForm fields={m.content.fields ?? []} value={content} onChange={setContent} t={tRoot} />}

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
