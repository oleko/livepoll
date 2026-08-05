import { describe, it, expect } from "vitest";
import { slideRegistry, slideTypesInOrder } from "../slides";

const ALL_TYPES = ["splash", "speaker", "schedule", "quote", "final", "spin_wheel", "announcement", "reveal"] as const;

function fakeT(key: string) {
  return key;
}

describe("slideRegistry", () => {
  it("has exactly the eight slide types — adding a ninth without registering it here is a compile error, not this test failing", () => {
    expect(Object.keys(slideRegistry).sort()).toEqual([...ALL_TYPES].sort());
  });

  it("every module's id matches its registry key", () => {
    for (const type of ALL_TYPES) {
      expect(slideRegistry[type].id).toBe(type);
    }
  });

  it("every module declares an icon and a label key", () => {
    for (const type of ALL_TYPES) {
      const m = slideRegistry[type];
      expect(m.meta.icon.length).toBeGreaterThan(0);
      expect(m.meta.labelKey).toMatch(/^Org\./);
    }
  });

  it("every module can produce content editing UI — either fields or a bespoke Editor", () => {
    for (const type of ALL_TYPES) {
      const m = slideRegistry[type];
      const hasFields = Array.isArray(m.content.fields) && m.content.fields.length > 0;
      const hasEditor = typeof m.content.Editor === "function";
      expect(hasFields || hasEditor, `${type} has neither fields nor an Editor`).toBe(true);
    }
  });

  it("every module renders a display component", () => {
    for (const type of ALL_TYPES) {
      expect(typeof slideRegistry[type].render.display).toBe("function");
    }
  });

  it("defaults() round-trips through fromRow() without throwing and preserves shape", () => {
    for (const type of ALL_TYPES) {
      const m = slideRegistry[type];
      const defaults = m.content.defaults();
      expect(defaults).toBeTypeOf("object");
      const rehydrated = m.content.fromRow(defaults);
      expect(rehydrated).toEqual(defaults);
    }
  });

  it("fromRow() tolerates null/undefined/garbage input instead of throwing", () => {
    for (const type of ALL_TYPES) {
      const m = slideRegistry[type];
      expect(() => m.content.fromRow(null)).not.toThrow();
      expect(() => m.content.fromRow(undefined)).not.toThrow();
      expect(() => m.content.fromRow("not an object")).not.toThrow();
      expect(m.content.fromRow(null)).toBeTypeOf("object");
    }
  });

  it("preview() never throws on defaults, even before any content is entered", () => {
    for (const type of ALL_TYPES) {
      const m = slideRegistry[type];
      expect(() => m.content.preview(m.content.defaults(), fakeT)).not.toThrow();
      expect(m.content.preview(m.content.defaults(), fakeT)).toBeTypeOf("string");
    }
  });

  it("slideTypesInOrder contains all eight types exactly once", () => {
    expect([...slideTypesInOrder].sort()).toEqual([...ALL_TYPES].sort());
    expect(slideTypesInOrder.length).toBe(ALL_TYPES.length);
  });

  it("only spin_wheel and reveal declare live display state (the other six pass void through unused)", () => {
    const withLive = ALL_TYPES.filter((t) => typeof slideRegistry[t].useDisplayLive === "function");
    expect(withLive.sort()).toEqual(["reveal", "spin_wheel"]);
  });

  it("hostActions, where present, have a run function and a label key", () => {
    for (const type of ALL_TYPES) {
      const actions = slideRegistry[type].hostActions ?? [];
      for (const a of actions) {
        expect(typeof a.run).toBe("function");
        expect(a.labelKey).toMatch(/^Org\./);
      }
    }
  });
});
