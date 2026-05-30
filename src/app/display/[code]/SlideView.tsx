import type { SlideType } from "@/lib/actions/slides";

type ScheduleItem = { time: string; title: string; active?: boolean };

type SlideData = {
  id: string;
  type: SlideType;
  content: Record<string, unknown>;
};

function SplashSlide({ c }: { c: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-16 gap-8">
      <h1 className="text-6xl lg:text-8xl font-bold text-white leading-tight tracking-tight">
        {c.title}
      </h1>
      {c.subtitle && (
        <p className="text-2xl lg:text-3xl text-slate-300 font-light max-w-3xl">{c.subtitle}</p>
      )}
      {(c.date || c.location) && (
        <p className="text-xl text-slate-400 font-medium">
          {[c.date, c.location].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function SpeakerSlide({ c }: { c: Record<string, string> }) {
  const initials = c.name
    ? c.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="flex h-full">
      {/* Left: avatar */}
      <div className="w-2/5 flex items-center justify-center bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border-r border-white/10">
        {c.photo_url ? (
          <img src={c.photo_url} alt={c.name} className="w-64 h-64 lg:w-80 lg:h-80 rounded-full object-cover shadow-2xl" />
        ) : (
          <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
            <span className="text-7xl lg:text-9xl font-bold text-white">{initials}</span>
          </div>
        )}
      </div>

      {/* Right: info */}
      <div className="flex-1 flex flex-col justify-center px-16 gap-5">
        <p className="text-lg text-indigo-400 font-semibold uppercase tracking-widest">
          Следующий докладчик
        </p>
        <h2 className="text-5xl lg:text-6xl font-bold text-white leading-tight">{c.name}</h2>
        {(c.role || c.company) && (
          <p className="text-2xl text-slate-300">
            {[c.role, c.company].filter(Boolean).join(" · ")}
          </p>
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

function ScheduleSlide({ c }: { c: { items?: ScheduleItem[] } }) {
  const items = c.items ?? [];
  const activeIdx = items.findIndex(it => it.active);

  return (
    <div className="flex flex-col h-full px-16 py-14 gap-8">
      <h2 className="text-3xl font-bold text-white">Расписание</h2>
      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        {items.map((item, i) => {
          const isActive = i === activeIdx;
          const isPast = activeIdx >= 0 && i < activeIdx;
          return (
            <div key={i} className={`flex items-center gap-6 rounded-xl px-6 py-4 transition-all ${
              isActive ? "bg-indigo-600/20 border border-indigo-500/50" : "border border-transparent"
            }`}>
              <span className={`text-xl font-mono font-semibold shrink-0 w-16 ${
                isActive ? "text-indigo-400" : isPast ? "text-slate-600" : "text-slate-400"
              }`}>{item.time}</span>
              {isActive && <span className="text-indigo-400 shrink-0 text-lg">▶</span>}
              <span className={`text-xl lg:text-2xl font-medium ${
                isActive ? "text-white" : isPast ? "text-slate-600 line-through" : "text-slate-300"
              }`}>{item.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuoteSlide({ c }: { c: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-20 gap-8 text-center">
      <div className="text-8xl text-indigo-500/40 font-serif leading-none select-none">"</div>
      <blockquote className="text-3xl lg:text-4xl text-white font-light leading-relaxed max-w-4xl -mt-8">
        {c.text}
      </blockquote>
      {c.author && (
        <p className="text-xl text-slate-400">— {c.author}</p>
      )}
    </div>
  );
}

function FinalSlide({ c }: { c: Record<string, string> }) {
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

export function SlideView({ slide }: { slide: SlideData }) {
  const c = slide.content as Record<string, unknown>;
  return (
    <div className="w-full h-full bg-slate-950">
      {slide.type === "splash"   && <SplashSlide   c={c as Record<string, string>} />}
      {slide.type === "speaker"  && <SpeakerSlide  c={c as Record<string, string>} />}
      {slide.type === "schedule" && <ScheduleSlide c={c as { items?: ScheduleItem[] }} />}
      {slide.type === "quote"    && <QuoteSlide    c={c as Record<string, string>} />}
      {slide.type === "final"    && <FinalSlide    c={c as Record<string, string>} />}
    </div>
  );
}
