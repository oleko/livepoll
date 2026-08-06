import { describe, it, expect } from "vitest";
import { pollRegistry, pollModule } from "../polls";

describe("pollRegistry", () => {
  it("has multiple_choice, word_cloud, emoji_cloud, temperature, like_dislike and planning_poker registered as the migrated poll types so far", () => {
    expect(pollModule("multiple_choice")).toBeDefined();
    expect(pollModule("multiple_choice")!.id).toBe("multiple_choice");
    expect(pollModule("word_cloud")).toBeDefined();
    expect(pollModule("word_cloud")!.id).toBe("word_cloud");
    expect(pollModule("emoji_cloud")).toBeDefined();
    expect(pollModule("emoji_cloud")!.id).toBe("emoji_cloud");
    expect(pollModule("temperature")).toBeDefined();
    expect(pollModule("temperature")!.id).toBe("temperature");
    expect(pollModule("like_dislike")).toBeDefined();
    expect(pollModule("like_dislike")!.id).toBe("like_dislike");
    expect(pollModule("planning_poker")).toBeDefined();
    expect(pollModule("planning_poker")!.id).toBe("planning_poker");
  });

  it("returns undefined for not-yet-migrated types (safe fallback, not a throw)", () => {
    expect(pollModule("qa")).toBeUndefined();
    expect(pollModule("idea_wall")).toBeUndefined();
  });

  it("registry keys match their module's own id", () => {
    for (const [key, m] of Object.entries(pollRegistry)) {
      expect(m!.id).toBe(key);
    }
  });
});
