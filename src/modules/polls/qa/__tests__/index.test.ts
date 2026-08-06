import { describe, it, expect } from "vitest";
import { qa } from "../index";

describe("qa module", () => {
  describe("config.fromSettings", () => {
    it("defaults maxQuestions to 1 with no settings", () => {
      expect(qa.config.fromSettings({ options: [], settings: {} })).toEqual({ maxQuestions: 1 });
    });

    it("reads max_questions from settings", () => {
      expect(qa.config.fromSettings({ options: [], settings: { max_questions: 3 } })).toEqual({ maxQuestions: 3 });
    });
  });

  describe("aggregate", () => {
    it("tallies whatever is in votes (always empty for qa — questions live in a separate table)", () => {
      const agg = qa.aggregate([], { maxQuestions: 1 });
      expect(agg.total).toBe(0);
    });
  });

  it("stores to questions, not votes — the one poll type so far that isn't vote-shaped", () => {
    expect(qa.storage).toBe("questions");
  });

  it("declares its identity and render surfaces (no presenter view — falls back to GenericBars)", () => {
    expect(qa.id).toBe("qa");
    expect(qa.meta.labelKey).toMatch(/^Org\./);
    expect(typeof qa.render.participant).toBe("function");
    expect(typeof qa.render.display).toBe("function");
    expect(typeof qa.render.hostResult).toBe("function");
    expect(qa.render.presenter).toBeUndefined();
    expect(typeof qa.useDisplayLive).toBe("function");
  });
});
