"use client";

import { pollRegistry } from "@/core/registry/polls";
import { slideRegistry } from "@/core/registry/slides";
import type { PollType } from "@/types/database";
import type { SlideType } from "@/core/domain/slide";

type Props = {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
};

/**
 * Renders a type's icon from the registry.
 *
 * Call sites used to interpolate `meta.icon` as text, and three of them kept
 * their own emoji dictionary instead (NewPollForm's POLL_TYPES,
 * PresenterScreen's POLL_ICONS and SLIDE_ICONS) — so adding a ninth poll type
 * meant remembering four places, and they had already drifted (🌡 in the
 * registry against 🌡️ in two of the copies). Going through a component keeps
 * the registry the only list.
 */
export function PollTypeIcon({ type, size = 18, weight = "bold", className }: Props & { type: PollType }) {
  const Icon = pollRegistry[type].meta.Icon;
  return <Icon size={size} weight={weight} className={className} />;
}

export function SlideTypeIcon({ type, size = 18, weight = "bold", className }: Props & { type: SlideType }) {
  const Icon = slideRegistry[type].meta.Icon;
  return <Icon size={size} weight={weight} className={className} />;
}
