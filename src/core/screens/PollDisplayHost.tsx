"use client";

import type { PollTypeModule, PollLiveCtx } from "@/core/modules/poll";

function noLive() {
  return undefined;
}

function Inner({ module: m, config, agg, ctx, accent, isDark }: {
  module: PollTypeModule<unknown, unknown, unknown>;
  config: unknown;
  agg: unknown;
  ctx: PollLiveCtx;
  accent: string;
  isDark: boolean;
}) {
  const live = (m.useDisplayLive ?? noLive)(ctx);
  const Display = m.render.display;
  return <Display config={config} agg={agg} live={live} accent={accent} isDark={isDark} />;
}

/**
 * Keyed by poll type so React remounts (and hook order stays legal) when the
 * active poll switches type — same discipline as `SlideHost` in SlideView.
 */
export function PollDisplayHost({ type, ...rest }: {
  type: string;
  module: PollTypeModule<unknown, unknown, unknown>;
  config: unknown;
  agg: unknown;
  ctx: PollLiveCtx;
  accent: string;
  isDark: boolean;
}) {
  return <Inner key={type} {...rest} />;
}
