import type { SlideType } from "@/core/domain/slide";
import type { ConfigField, Translator } from "@/core/settings/field";

export type SlideLiveCtx = {
  /** null when the slide is rendered statically (e.g. a host preview) — modules must not subscribe in that case. */
  sessionId: string | null;
  slideId: string;
  showKey: number;
};

export type SlideDisplayProps<Live = void> = {
  content: Record<string, unknown>;
  live: Live;
  showKey: number;
};

export type SlideParticipantProps<Live = void> = {
  content: Record<string, unknown>;
  live: Live;
};

export type HostActionCtx = { slideId: string; sessionId: string; orgSlug: string };

/**
 * Everything the app needs to know about one slide type. A module fully
 * describes: how a host authors it (content.fields/Editor), how it appears
 * in the lineup (content.preview), what it looks like on the projector
 * (render.display), whether it does anything on participants' phones
 * (participantEffect + render.participant), and any host-triggered actions
 * beyond show/hide/delete (hostActions — e.g. "reveal the answer").
 */
export interface SlideTypeModule<Live = void> {
  readonly id: SlideType;
  readonly meta: { icon: string; labelKey: string; order: number };

  readonly content: {
    defaults(): Record<string, unknown>;
    fromRow(raw: unknown): Record<string, unknown>;
    preview(c: Record<string, unknown>, t: Translator): string;
    /** Most modules render <ConfigForm fields={fields} .../>; a few (schedule) need bespoke UI. */
    fields?: ConfigField[];
    Editor?: React.ComponentType<{
      value: Record<string, unknown>;
      onChange: (v: Record<string, unknown>) => void;
      t: Translator;
    }>;
  };

  readonly participantEffect: null | "overlay" | "interactive";

  /** Module-owned realtime/derived state for the projector. Nothing if omitted. */
  readonly useDisplayLive?: (ctx: SlideLiveCtx) => Live;
  /** Module-owned realtime/derived state for the participant's phone. */
  readonly useParticipantLive?: (ctx: { sessionId: string; slide: { type: SlideType; content: Record<string, unknown> } | null }) => Live;

  readonly render: {
    display: React.ComponentType<SlideDisplayProps<Live>>;
    participant?: React.ComponentType<SlideParticipantProps<Live>>;
  };

  /** Buttons in the host's lineup card beyond show/hide/duplicate/delete (e.g. "Launch wheel", "Reveal answer"). */
  readonly hostActions?: {
    id: string;
    labelKey: string;
    /** Only show this action while the slide is the one currently on screen. */
    whenActive: boolean;
    run(ctx: HostActionCtx): Promise<void>;
  }[];
}
