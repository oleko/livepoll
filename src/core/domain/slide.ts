export type SlideType =
  | "splash"
  | "speaker"
  | "schedule"
  | "quote"
  | "final"
  | "spin_wheel"
  | "announcement"
  | "reveal";

export type SlideContent =
  | { type: "splash";       title: string; subtitle?: string; date?: string; location?: string }
  | { type: "speaker";      name: string; role?: string; company?: string; topic?: string; photo_url?: string }
  | { type: "schedule";     items: { time: string; title: string; active?: boolean }[] }
  | { type: "quote";        text: string; author?: string }
  | { type: "final";        title: string; subtitle?: string; url?: string }
  | { type: "spin_wheel";   title?: string; options: string[] }
  | { type: "announcement"; text: string; duration?: number }
  | { type: "reveal";       question: string; answer: string; buzz?: boolean };

export type SlideRow = {
  id: string;
  session_id: string;
  type: SlideType;
  content: Record<string, unknown>;
  sort_order: number;
  section_id: string | null;
  created_at: string;
};

/** Minimal shape broadcast over realtime for the active slide. */
export type SlideRef = {
  id: string;
  type: SlideType;
  content: Record<string, unknown>;
};
