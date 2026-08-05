import { describe, it, expect } from "vitest";
import { pollRegistry, pollModule } from "../polls";

describe("pollRegistry", () => {
  it("has multiple_choice registered as the first migrated poll type", () => {
    expect(pollModule("multiple_choice")).toBeDefined();
    expect(pollModule("multiple_choice")!.id).toBe("multiple_choice");
  });

  it("returns undefined for not-yet-migrated types (safe fallback, not a throw)", () => {
    expect(pollModule("temperature")).toBeUndefined();
    expect(pollModule("word_cloud")).toBeUndefined();
    expect(pollModule("emoji_cloud")).toBeUndefined();
    expect(pollModule("qa")).toBeUndefined();
    expect(pollModule("like_dislike")).toBeUndefined();
    expect(pollModule("planning_poker")).toBeUndefined();
    expect(pollModule("idea_wall")).toBeUndefined();
  });

  it("registry keys match their module's own id", () => {
    for (const [key, m] of Object.entries(pollRegistry)) {
      expect(m!.id).toBe(key);
    }
  });
});
