import type { SlideTypeModule } from "@/core/modules/slide";

function Display({ content }: { content: Record<string, unknown> }) {
  const c = content as Record<string, string>;
  return (
    <div className="flex flex-col items-center justify-center h-full px-16 gap-8 text-center">
      <div className="text-8xl">🎉</div>
      <h1 className="text-5xl lg:text-7xl font-bold text-white">{c.title || "Спасибо за участие!"}</h1>
      {c.subtitle && <p className="text-2xl text-slate-300 font-light">{c.subtitle}</p>}
      {c.url && (
        <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl px-8 py-4">
          <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-medium">Материалы</p>
          <p className="text-2xl text-indigo-400 font-medium">{c.url}</p>
        </div>
      )}
    </div>
  );
}

export const final: SlideTypeModule = {
  id: "final",
  meta: { icon: "🎉", labelKey: "Org.shared.slideTypeLabel.final", order: 4 },
  content: {
    defaults: () => ({}),
    fromRow: (raw) => (raw && typeof raw === "object" ? raw as Record<string, unknown> : {}),
    preview: (c, t) => (c.title as string) || t("Org.session.pollList.slidePreview.finalScreen"),
    fields: [
      { kind: "text", name: "title", labelKey: "Org.session.addSlidePanel.final.title", required: true },
      { kind: "text", name: "subtitle", labelKey: "Org.session.addSlidePanel.final.subtitle" },
      { kind: "text", name: "url", labelKey: "Org.session.addSlidePanel.final.url" },
    ],
  },
  participantEffect: null,
  render: { display: Display },
};
