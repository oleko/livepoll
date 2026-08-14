import type { SlideTypeModule } from "@/core/modules/slide";

// The date field stores an ISO yyyy-mm-dd (native <input type="date">);
// display it localized rather than as raw ISO text.
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function Display({ content }: { content: Record<string, unknown> }) {
  const c = content as Record<string, string>;
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-16 gap-8">
      <h1 className="text-6xl lg:text-8xl font-bold text-white leading-tight tracking-tight">{c.title}</h1>
      {c.subtitle && <p className="text-2xl lg:text-3xl text-slate-300 font-light max-w-3xl">{c.subtitle}</p>}
      {(c.date || c.location) && (
        <p className="text-xl text-slate-400 font-medium">{[c.date && formatDate(c.date), c.location].filter(Boolean).join(" · ")}</p>
      )}
    </div>
  );
}

export const splash: SlideTypeModule = {
  id: "splash",
  meta: { icon: "🎯", labelKey: "Org.shared.slideTypeLabel.splash", order: 0 },
  content: {
    defaults: () => ({}),
    fromRow: (raw) => (raw && typeof raw === "object" ? raw as Record<string, unknown> : {}),
    preview: (c, t) => (c.title as string) || t("Org.session.pollList.slidePreview.untitled"),
    fields: [
      { kind: "text", name: "title", labelKey: "Org.session.addSlidePanel.splash.title", required: true },
      { kind: "text", name: "subtitle", labelKey: "Org.session.addSlidePanel.splash.subtitle" },
      { kind: "date", name: "date", labelKey: "Org.session.addSlidePanel.splash.date", minToday: true },
      { kind: "text", name: "location", labelKey: "Org.session.addSlidePanel.splash.location" },
    ],
  },
  participantEffect: null,
  render: { display: Display },
};
