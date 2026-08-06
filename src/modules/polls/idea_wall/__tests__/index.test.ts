import { describe, it, expect } from "vitest";
import { idea_wall } from "../index";

describe("idea_wall module", () => {
  describe("config.fromSettings", () => {
    it("has no configurable settings — unlimited submissions, no max_questions cap", () => {
      expect(idea_wall.config.fromSettings({ options: [], settings: { max_questions: 5 } })).toEqual({});
    });
  });

  describe("useDisplayLive", () => {
    it("filters out hidden questions and sorts by upvotes descending", () => {
      const ctx = {
        sessionId: "s1", pollId: "p1", quizReveal: null, votes: [],
        questions: [
          { id: "a", text: "A", status: "pending" as const, upvotes: 1 },
          { id: "b", text: "B", status: "hidden" as const, upvotes: 99 },
          { id: "c", text: "C", status: "pending" as const, upvotes: 5 },
        ],
      };
      const live = idea_wall.useDisplayLive!(ctx);
      expect(live.visibleQuestions.map((q) => q.id)).toEqual(["c", "a"]);
    });
  });

  it("stores to questions, same as qa", () => {
    expect(idea_wall.storage).toBe("questions");
  });

  it("declares its identity and render surfaces (no presenter view)", () => {
    expect(idea_wall.id).toBe("idea_wall");
    expect(idea_wall.meta.labelKey).toMatch(/^Org\./);
    expect(typeof idea_wall.render.participant).toBe("function");
    expect(typeof idea_wall.render.display).toBe("function");
    expect(typeof idea_wall.render.hostResult).toBe("function");
    expect(idea_wall.render.presenter).toBeUndefined();
  });
});
