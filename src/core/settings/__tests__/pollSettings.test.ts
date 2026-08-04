import { describe, it, expect } from "vitest";
import { parsePollSettings } from "../pollSettings";

describe("parsePollSettings", () => {
  it("parses a full settings object", () => {
    const s = parsePollSettings({ duration: 30, quiz_mode: true, correct_option: "A" });
    expect(s.duration).toBe(30);
    expect(s.quiz_mode).toBe(true);
    expect(s.correct_option).toBe("A");
  });

  it("defaults to an empty object for null/undefined", () => {
    expect(parsePollSettings(null)).toEqual({});
    expect(parsePollSettings(undefined)).toEqual({});
  });

  it("keeps unrecognized keys via passthrough instead of rejecting", () => {
    const s = parsePollSettings({ duration: 10, some_future_field: "x" });
    expect(s.duration).toBe(10);
    expect((s as Record<string, unknown>).some_future_field).toBe("x");
  });

  it("falls back to an empty object when a known field has the wrong type", () => {
    expect(parsePollSettings({ duration: "not a number" })).toEqual({});
  });
});
