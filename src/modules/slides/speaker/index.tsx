import type { SlideTypeModule } from "@/core/modules/slide";

function Display({ content }: { content: Record<string, unknown> }) {
  const c = content as Record<string, string>;
  const initials = c.name ? c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div className="flex h-full">
      <div className="w-2/5 flex items-center justify-center bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border-r border-white/10">
        {c.photo_url ? (
          <img src={c.photo_url} alt={c.name} className="w-64 h-64 lg:w-80 lg:h-80 rounded-full object-cover shadow-2xl" />
        ) : (
          <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
            <span className="text-7xl lg:text-9xl font-bold text-white">{initials}</span>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center px-16 gap-5">
        <p className="text-lg text-indigo-400 font-semibold uppercase tracking-widest">Следующий докладчик</p>
        <h2 className="text-5xl lg:text-6xl font-bold text-white leading-tight">{c.name}</h2>
        {(c.role || c.company) && (
          <p className="text-2xl text-slate-300">{[c.role, c.company].filter(Boolean).join(" · ")}</p>
        )}
        {c.topic && (
          <div className="mt-4 border-l-4 border-indigo-500 pl-6">
            <p className="text-xl text-slate-200 italic leading-relaxed">«{c.topic}»</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const speaker: SlideTypeModule = {
  id: "speaker",
  meta: { icon: "🎤", labelKey: "Org.shared.slideTypeLabel.speaker", order: 1 },
  content: {
    defaults: () => ({}),
    fromRow: (raw) => (raw && typeof raw === "object" ? raw as Record<string, unknown> : {}),
    preview: (c, t) => (c.name as string) || t("Org.session.pollList.slidePreview.unnamed"),
    fields: [
      { kind: "text", name: "name", labelKey: "Org.session.addSlidePanel.speaker.name", required: true },
      { kind: "text", name: "role", labelKey: "Org.session.addSlidePanel.speaker.role" },
      { kind: "text", name: "company", labelKey: "Org.session.addSlidePanel.speaker.company" },
      { kind: "text", name: "topic", labelKey: "Org.session.addSlidePanel.speaker.topic" },
      { kind: "text", name: "photo_url", labelKey: "Org.session.addSlidePanel.speaker.photoUrl" },
    ],
  },
  participantEffect: null,
  render: { display: Display },
};
