"use client";

import { useEffect, useState } from "react";

export type AnnouncementData = { text: string; duration: number; started_at: string };

/**
 * Owns announcement state and its own countdown. Previously DisplayScreen
 * and VoteInterface each hand-rolled an identical `useState` + countdown
 * `useEffect` pair (a third copy lives in SlideView's AnnouncementSlide,
 * which ticks down from mount rather than from a shared `started_at` and is
 * left alone here — unifying it would change its behavior, not just its shape).
 */
export function useAnnouncement(initial: AnnouncementData | null = null) {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(initial);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (!announcement || announcement.duration <= 0) {
        setTimeLeft(null);
        return;
      }
      const elapsed = (Date.now() - new Date(announcement.started_at).getTime()) / 1000;
      const left = Math.ceil(Math.max(0, announcement.duration - elapsed));
      setTimeLeft(left);
      if (left <= 0) setAnnouncement(null);
    };
    update();
    if (!announcement || announcement.duration <= 0) return;
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [announcement]);

  return { announcement, timeLeft, setAnnouncement };
}
