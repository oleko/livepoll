"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { saveBranding, type BrandingSettings } from "@/lib/actions/branding";
import { Checkbox } from "@/components/ui/Checkbox";

const PRESET_COLORS = [
  { key: "presetIndigo",   value: "#6366f1" },
  { key: "presetViolet",   value: "#8b5cf6" },
  { key: "presetBlue",     value: "#3b82f6" },
  { key: "presetCyan",     value: "#06b6d4" },
  { key: "presetEmerald",  value: "#10b981" },
  { key: "presetPink",     value: "#ec4899" },
  { key: "presetAmber",    value: "#f59e0b" },
];

function isHexColor(s: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export function BrandingForm({
  orgSlug,
  initial,
  orgPlan,
}: {
  orgSlug: string;
  initial: BrandingSettings;
  orgPlan: string;
}) {
  const t = useTranslations("Org.branding");
  const whiteLabelAvailable = orgPlan === "team" || orgPlan === "unlimited";
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logo_url ?? null);
  const [logoFile,    setLogoFile]    = useState<File | null>(null);
  const [removeLogo,  setRemoveLogo]  = useState(false);

  const [accentColor, setAccentColor] = useState(initial.accent_color ?? "#6366f1");
  const [accentInput, setAccentInput] = useState(initial.accent_color ?? "#6366f1");

  const [useCustomBg, setUseCustomBg]     = useState(!!initial.display_bg);
  const [displayBg,   setDisplayBg]       = useState(initial.display_bg ?? "#0f172a");
  const [displayBgImage, setDisplayBgImage] = useState(initial.display_bg_image ?? "");
  const [displayFont, setDisplayFont]     = useState(initial.display_font ?? "sans");
  const [displayHeader, setDisplayHeader] = useState(initial.display_header ?? "");
  const [whiteLabel, setWhiteLabel] = useState(!!initial.white_label);

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setRemoveLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  }

  function onRemoveLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function applyAccent(val: string) {
    setAccentColor(val);
    setAccentInput(val);
  }

  function onAccentInput(val: string) {
    setAccentInput(val);
    if (isHexColor(val)) setAccentColor(val);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const fd = new FormData();
    if (logoFile)        fd.append("logo_file",      logoFile);
    if (removeLogo)      fd.append("remove_logo",    "1");
    if (accentColor)          fd.append("accent_color",     accentColor);
    if (useCustomBg)          fd.append("display_bg",       displayBg);
    fd.append("display_bg_image", displayBgImage.trim());
    fd.append("display_font",     displayFont);
    fd.append("display_header",   displayHeader);
    if (whiteLabel)             fd.append("white_label",    "1");

    const result = await saveBranding(fd, orgSlug);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col gap-8">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("title")}</h2>

      {/* ── Logo ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <Label>{t("logoLabel")}</Label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt={t("logoAlt")} className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-2xl opacity-30">🖼️</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t("uploadButton")}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  {t("removeLogoButton")}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t("logoHint")}</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
        />
      </section>

      {/* ── Accent color ───────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <Label>{t("accentLabel")}</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={t(c.key as Parameters<typeof t>[0])}
              onClick={() => applyAccent(c.value)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{
                backgroundColor: c.value,
                boxShadow: accentColor === c.value
                  ? `0 0 0 2px white, 0 0 0 4px ${c.value}`
                  : undefined,
              }}
            />
          ))}
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="color"
              value={isHexColor(accentColor) ? accentColor : "#6366f1"}
              onChange={(e) => applyAccent(e.target.value)}
              className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent p-0"
              title={t("accentCustomTitle")}
            />
            <input
              type="text"
              value={accentInput}
              onChange={(e) => onAccentInput(e.target.value)}
              maxLength={7}
              className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="#6366f1"
            />
          </div>
        </div>
        {/* Preview */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            {t("accentPreview")}
          </button>
          <div
            className="h-2.5 flex-1 rounded-full"
            style={{ backgroundColor: accentColor, opacity: 0.3 }}
          />
        </div>
      </section>

      {/* ── Display background ─────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <Label>{t("displayBgLabel")}</Label>
        <div className="flex flex-col gap-2">
          <RadioRow
            checked={!useCustomBg}
            onChange={() => setUseCustomBg(false)}
            label={t("bgDefault")}
            hint={t("bgDefaultHint")}
          />
          <div className="flex items-start gap-3">
            <RadioRow
              checked={useCustomBg}
              onChange={() => setUseCustomBg(true)}
              label={t("bgCustom")}
              hint={t("bgCustomHint")}
            />
            {useCustomBg && (
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="color"
                  value={isHexColor(displayBg) ? displayBg : "#0f172a"}
                  onChange={(e) => setDisplayBg(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={displayBg}
                  onChange={(e) => setDisplayBg(e.target.value)}
                  maxLength={7}
                  className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700"
                  style={{ backgroundColor: isHexColor(displayBg) ? displayBg : undefined }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Background image ───────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <Label>{t("displayBgImageLabel")}</Label>
        <input
          type="url"
          value={displayBgImage}
          onChange={(e) => setDisplayBgImage(e.target.value)}
          placeholder="https://example.com/background.jpg"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("bgImageHint")}
        </p>
      </section>

      {/* ── Display font ───────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <Label>{t("displayFontLabel")}</Label>
        <div className="flex gap-2 flex-wrap">
          {([
            { value: "sans",  labelKey: "fontSans",  hint: "sans-serif" },
            { value: "serif", labelKey: "fontSerif", hint: "serif" },
            { value: "mono",  labelKey: "fontMono",  hint: "monospace" },
          ] as const).map(opt => (
            <label key={opt.value} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${displayFont === opt.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"}`}>
              <input
                type="radio"
                name="display_font"
                value={opt.value}
                checked={displayFont === opt.value}
                onChange={() => setDisplayFont(opt.value)}
                className="accent-indigo-600 shrink-0"
              />
              <div>
                <p className="text-sm text-slate-900 dark:text-white">{t(opt.labelKey)}</p>
                <p className="text-xs text-slate-400">{opt.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* ── Display header ─────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <Label>{t("displayHeaderLabel")}</Label>
        <input
          type="text"
          value={displayHeader}
          onChange={(e) => setDisplayHeader(e.target.value)}
          maxLength={80}
          placeholder={t("displayHeaderPlaceholder")}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("displayHeaderHint")}
        </p>
      </section>

      {/* ── White label ────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <Label>{t("whiteLabelLabel")}</Label>
        {whiteLabelAvailable ? (
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={whiteLabel}
              onCheckedChange={(v) => setWhiteLabel(v === true)}
            />
            <div>
              <p className="text-sm text-slate-900 dark:text-white">{t("whiteLabelText")}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {t("whiteLabelDesc")}
              </p>
            </div>
          </label>
        ) : (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("whiteLabelUnavailable")}
            </p>
            <span className="text-xs rounded-full bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 text-slate-500 dark:text-slate-400 shrink-0">
              {t("whiteLabelLocked")}
            </span>
          </div>
        )}
      </section>

      {/* ── Save ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white transition-colors"
          style={!saving ? { backgroundColor: accentColor } : undefined}
        >
          {saving ? t("savingButton") : saved ? t("savedButton") : t("saveButton")}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {children}
    </p>
  );
}

function RadioRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-indigo-600 shrink-0"
      />
      <div>
        <p className="text-sm text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      </div>
    </label>
  );
}
