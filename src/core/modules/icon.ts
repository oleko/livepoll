import type { ComponentType } from "react";

/**
 * The icon a type shows in the host UI.
 *
 * Every type used to carry an emoji string in `meta.icon`. Emoji look like a
 * free icon set and are not one: each platform draws them differently, they
 * cannot take the accent colour or a stroke weight, their optical sizes do not
 * match each other, and 🌡 vs 🌡️ are different strings that render at
 * different widths. On a projector in a hall that reads as sloppiness.
 *
 * Phosphor was already a dependency and already used across the landing page,
 * including an icon for all eight poll types — it was simply never applied
 * inside the app. This type is what lets a module hand over a component
 * instead of a character.
 *
 * Emoji that are the product's CONTENT stay emoji and must not be migrated:
 * the temperature scale (❄️🥶😐🌡️🔥), the like/dislike buttons, the whole
 * emoji_cloud type, and the 🔥 pulse button. Those are what the audience
 * taps and sees, not chrome.
 */
export type TypeIcon = ComponentType<{
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

export type TypeMeta = {
  Icon: TypeIcon;
  labelKey: string;
  order: number;
};
