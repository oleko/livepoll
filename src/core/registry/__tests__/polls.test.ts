import { describe, it, expect } from "vitest";
import { pollRegistry, pollModule } from "../polls";

describe("pollRegistry", () => {
  it("has multiple_choice and word_cloud registered as the migrated poll types so far", () => {
    expect(pollModule("multiple_choice")).toBeDefined();
    expect(pollModule("multiple_choice")!.id).toBe("multiple_choice");
    expect(pollModule("word_cloud")).toBeDefined();
    expect(pollModule("word_cloud")!.id).toBe("word_cloud");
  });

  it("returns undefined for not-yet-migrated types (safe fallback, not a throw)", () => {
    expect(pollModule("temperature")).toBeUndefined();
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
