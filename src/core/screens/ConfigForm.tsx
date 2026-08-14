"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import type { ConfigField, Translator } from "@/core/settings/field";

const inputClass = "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";

/**
 * The one form renderer for slide (and eventually poll) content editing,
 * driven by a `ConfigField[]` descriptor. Replaces three independent
 * per-type form implementations (PollList's SlideEditForm, AddSlidePanel's
 * per-type components, SlidesPanel's per-type components) that each had to
 * be updated in lockstep — and each drifted: two of the three had no form
 * at all for spin_wheel/announcement/reveal.
 */
export function ConfigForm({
  fields,
  value,
  onChange,
  t,
}: {
  fields: ConfigField[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  t: Translator;
}) {
  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <ConfigFieldInput key={field.name} field={field} value={value} onChange={onChange} t={t} />
      ))}
    </div>
  );
}

function ConfigFieldInput({
  field,
  value,
  onChange,
  t,
}: {
  field: ConfigField;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  t: Translator;
}) {
  const set = (v: unknown) => onChange({ ...value, [field.name]: v });

  switch (field.kind) {
    case "text":
      return (
        <input
          type="text"
          value={(value[field.name] as string) ?? ""}
          onChange={(e) => set(e.target.value)}
          placeholder={t(field.labelKey)}
          maxLength={field.maxLength}
          className={inputClass}
        />
      );

    case "textarea":
      return (
        <textarea
          value={(value[field.name] as string) ?? ""}
          onChange={(e) => set(e.target.value)}
          placeholder={t(field.labelKey)}
          rows={field.rows ?? 3}
          maxLength={field.maxLength}
          className={`${inputClass} resize-none`}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={(value[field.name] as number | undefined) ?? ""}
          onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
          placeholder={t(field.labelKey)}
          min={field.min}
          max={field.max}
          className={inputClass}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={(value[field.name] as string) ?? ""}
          onChange={(e) => set(e.target.value)}
          min={field.minToday ? new Date().toISOString().slice(0, 10) : undefined}
          className={inputClass}
        />
      );

    case "select": {
      const current = value[field.name];
      const currentStr = current == null ? (field.options[0]?.value ?? "") : String(current);
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{t(field.labelKey)}</span>
          <select
            value={currentStr}
            onChange={(e) => set(field.numeric ? Number(e.target.value) : e.target.value)}
            className={`${inputClass} flex-1`}
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
        </div>
      );
    }

    case "toggle":
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={!!value[field.name]}
            onCheckedChange={(checked) => set(checked === true)}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400">{t(field.labelKey)}</span>
        </label>
      );

    case "list":
      return <ListField field={field} value={value} onChange={onChange} t={t} />;
  }
}

function ListField({
  field,
  value,
  onChange,
  t,
}: {
  field: Extract<ConfigField, { kind: "list" }>;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  t: Translator;
}) {
  const [rawText, setRawText] = useState(((value[field.name] as string[] | undefined) ?? []).join("\n"));
  const maxLen = field.itemMaxLength;
  const tooLong = maxLen != null && rawText.split("\n").some((s) => s.trim().length > maxLen);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 dark:text-slate-400">{t(field.labelKey)}</span>
      <textarea
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          const items = e.target.value.split("\n").map((s) => s.trim().slice(0, maxLen)).filter(Boolean);
          onChange({ ...value, [field.name]: items });
        }}
        rows={5}
        placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
        className={`${inputClass} resize-none ${tooLong ? "border-amber-400 dark:border-amber-500 focus:ring-amber-400" : ""}`}
      />
      {tooLong && maxLen != null && field.tooLongKey && (
        <p className="text-xs text-amber-500">{t(field.tooLongKey, { max: maxLen })}</p>
      )}
    </div>
  );
}
