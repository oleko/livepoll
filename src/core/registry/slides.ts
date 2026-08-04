import type { SlideType } from "@/core/domain/slide";
import type { SlideTypeModule } from "@/core/modules/slide";
import { splash } from "@/modules/slides/splash";
import { speaker } from "@/modules/slides/speaker";
import { schedule } from "@/modules/slides/schedule";
import { quote } from "@/modules/slides/quote";
import { final } from "@/modules/slides/final";
import { spin_wheel } from "@/modules/slides/spin_wheel";
import { announcement } from "@/modules/slides/announcement";
import { reveal } from "@/modules/slides/reveal";

/**
 * Every slide type's module, keyed by its type. `Record<SlideType, ...>`
 * rather than `Partial<...>` — adding a 9th slide type without registering
 * it here is a compile error, not a silent gap (which is exactly how
 * spin_wheel/announcement/reveal ended up missing edit forms in two of the
 * three previous per-type UIs).
 *
 * Modules are individually typed against their own `Live` shape; storing
 * them together erases that to `unknown` here — each module's own Display
 * component is the only place that ever casts it back, so this erasure
 * never leaks into calling code.
 */
function erase<L>(m: SlideTypeModule<L>): SlideTypeModule<unknown> {
  return m as unknown as SlideTypeModule<unknown>;
}

export const slideRegistry: Record<SlideType, SlideTypeModule<unknown>> = {
  splash: erase(splash),
  speaker: erase(speaker),
  schedule: erase(schedule),
  quote: erase(quote),
  final: erase(final),
  spin_wheel: erase(spin_wheel),
  announcement: erase(announcement),
  reveal: erase(reveal),
};

export function slideModule(type: SlideType): SlideTypeModule<unknown> {
  return slideRegistry[type];
}

export const slideTypesInOrder: SlideType[] = (Object.values(slideRegistry) as SlideTypeModule<unknown>[])
  .sort((a, b) => a.meta.order - b.meta.order)
  .map((m) => m.id);
