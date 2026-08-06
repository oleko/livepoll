import { describe, it, expect } from "vitest";
import { pollRegistry, pollModule } from "../polls";

describe("pollRegistry", () => {
  it("has 7 of 8 poll types registered so far", () => {
    for (const type of ["multiple_choice", "word_cloud", "emoji_cloud", "temperature", "like_dislike", "planning_poker", "qa"] as const) {
      expect(pollModule(type), type).toBeDefined();
      expect(pollModule(type)!.id).toBe(type);
    }
  });

  it("returns undefined for not-yet-migrated types (safe fallback, not a throw)", () => {
    expect(pollModule("idea_wall")).toBeUndefined();
  });

  it("registry keys match their module's own id", () => {
    for (const [key, m] of Object.entries(pollRegistry)) {
      expect(m!.id).toBe(key);
    }
  });
});
