"use client";

import { slideRegistry } from "@/core/registry/slides";
import type { SlideType } from "@/core/domain/slide";

type SlideRef = {
  id: string;
  type: SlideType;
  content: Record<string, unknown>;
};

function noLive() {
  return undefined;
}

/**
 * Keyed by slide.type so a type change fully remounts this host — that's
 * what makes it legal for each module's useDisplayLive to be called here
 * unconditionally: exactly one hook call happens per mount, and switching
 * from e.g. a spin_wheel slide to a reveal slide tears down one hook
 * instance and starts a fresh one rather than changing which hook a single
 * instance calls (which the rules of hooks forbid).
 */
function SlideHost({ slide, sessionId, showKey }: { slide: SlideRef; sessionId: string | null; showKey: number }) {
  const m = slideRegistry[slide.type];
  const live = (m.useDisplayLive ?? noLive)({ sessionId, slideId: slide.id, showKey });
  const Display = m.render.display;
  return <Display content={slide.content} live={live} showKey={showKey} />;
}

/**
 * `sessionId` is required for a live projector render (modules subscribe to
 * realtime updates scoped to it) and omitted for a static preview (e.g.
 * PollList's lineup thumbnail) — modules see `sessionId: null` there and
 * skip subscribing, so the preview always renders each slide's idle state.
 */
export function SlideView({ slide, sessionId, showKey = 0 }: {
  slide: SlideRef;
  sessionId?: string;
  showKey?: number;
}) {
  return (
    <div className="w-full h-full bg-slate-950">
      <SlideHost key={slide.type} slide={slide} sessionId={sessionId ?? null} showKey={showKey} />
    </div>
  );
}
