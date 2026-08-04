import type { SlideTypeModule } from "@/core/modules/slide";

function Display({ content }: { content: Record<string, unknown> }) {
  const c = content as Record<string, string>;
  return (
    <div className="flex flex-col items-center justify-center h-full px-20 gap-8 text-center">
      <div className="text-8xl text-indigo-500/40 font-serif leading-none select-none">&quot;</div>
      <blockquote className="text-3xl lg:text-4xl text-white font-light leading-relaxed max-w-4xl -mt-8">
        {c.text}
      </blockquote>
      {c.author && <p className="text-xl text-slate-400">— {c.author}</p>}
    </div>
  );
}

export const quote: SlideTypeModule = {
  id: "quote",
  meta: { icon: "💬", labelKey: "Org.shared.slideTypeLabel.quote", order: 3 },
  content: {
    defaults: () => ({}),
    fromRow: (raw) => (raw && typeof raw === "object" ? raw as Record<string, unknown> : {}),
    preview: (c, t) => {
      const text = c.text as string | undefined;
      if (!text) return t("Org.session.pollList.slidePreview.quote");
      return `"${text.slice(0, 50)}${text.length > 50 ? "…" : ""}"`;
    },
    fields: [
      { kind: "textarea", name: "text", labelKey: "Org.session.addSlidePanel.quote.text", required: true, rows: 3 },
      { kind: "text", name: "author", labelKey: "Org.session.addSlidePanel.quote.author" },
    ],
  },
  participantEffect: null,
  render: { display: Display },
};
