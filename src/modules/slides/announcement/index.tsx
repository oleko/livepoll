"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/core/format/time";
import type { SlideTypeModule } from "@/core/modules/slide";

/**
 * This is the full-slide-canvas presentation. The overlay participants and
 * the display screen normally see (via useAnnouncement + AnnouncementOverlay)
 * is a separate mechanism driven by the session-polls:announcement broadcast
 * that showSlide() also fans out — kept separate rather than unified here
 * since it ticks down from a shared `started_at` timestamp (survives a
 * reconnect mid-countdown), while this component ticks down from mount,
 * which is the right behavior only for the rare case this canvas actually
 * renders standalone.
 */
function Display({ content }: { content: Record<string, unknown> }) {
  const text = (content.text as string) ?? "";
  const duration = (content.duration as number | undefined) ?? 0;
  const [timeLeft, setTimeLeft] = useState(duration > 0 ? duration : null);

  useEffect(() => {
    const reset = () => setTimeLeft(duration > 0 ? duration : null);
    reset();
    if (!duration) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [duration]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-16 text-center">
      <div className="text-6xl">📢</div>
      <p className="font-bold text-white leading-tight" style={{ fontSize: "clamp(2.5rem, 8vh, 5rem)" }}>{text}</p>
      {timeLeft !== null && timeLeft > 0 && (
        <p className={`text-8xl font-mono font-bold tabular-nums ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-indigo-400"}`}>
          {formatClock(timeLeft)}
        </p>
      )}
    </div>
  );
}

export const announcement: SlideTypeModule = {
  id: "announcement",
  meta: { icon: "📢", labelKey: "Org.shared.slideTypeLabel.announcement", order: 6 },
  content: {
    defaults: () => ({ duration: 0 }),
    fromRow: (raw) => (raw && typeof raw === "object" ? raw as Record<string, unknown> : { duration: 0 }),
    preview: (c, t) => {
      const text = c.text as string | undefined;
      return text ? text.slice(0, 40) : t("Org.session.pollList.slidePreview.announcement");
    },
    fields: [
      { kind: "textarea", name: "text", labelKey: "Org.session.addSlidePanel.announcement.text", required: true, rows: 3 },
      {
        kind: "select", name: "duration", labelKey: "Org.session.addSlidePanel.announcement.timer", numeric: true,
        options: [
          { value: "0", labelKey: "Org.session.addSlidePanel.announcement.noTimer" },
          { value: "15", labelKey: "Org.session.addSlidePanel.announcement.sec15" },
          { value: "30", labelKey: "Org.session.addSlidePanel.announcement.sec30" },
          { value: "60", labelKey: "Org.session.addSlidePanel.announcement.min1" },
          { value: "120", labelKey: "Org.session.addSlidePanel.announcement.min2" },
          { value: "300", labelKey: "Org.session.addSlidePanel.announcement.min5" },
        ],
      },
    ],
  },
  participantEffect: "overlay",
  render: { display: Display },
};
