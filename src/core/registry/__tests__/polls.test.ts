import { describe, it, expect } from "vitest";
import { pollRegistry, pollModule } from "../polls";

const ALL_TYPES = [
  "multiple_choice", "word_cloud", "emoji_cloud", "temperature",
  "like_dislike", "planning_poker", "qa", "idea_wall",
] as const;

describe("pollRegistry", () => {
  it("has exactly the eight poll types — adding a ninth without registering it here is a compile error, not this test failing", () => {
    expect(Object.keys(pollRegistry).sort()).toEqual([...ALL_TYPES].sort());
  });

  it("every module's id matches its registry key", () => {
    for (const type of ALL_TYPES) {
      expect(pollModule(type).id).toBe(type);
    }
  });

  it("every module declares storage, an icon and a label key", () => {
    for (const type of ALL_TYPES) {
      const m = pollModule(type);
      expect(["votes", "questions"]).toContain(m.storage);
      expect(m.meta.icon.length).toBeGreaterThan(0);
      expect(m.meta.labelKey).toMatch(/^Org\./);
    }
  });

  it("qa and idea_wall are the only storage:questions modules", () => {
    const questionsStorage = ALL_TYPES.filter((t) => pollModule(t).storage === "questions");
    expect(questionsStorage.sort()).toEqual(["idea_wall", "qa"]);
  });

  it("every module renders participant, display and hostResult", () => {
    for (const type of ALL_TYPES) {
      const m = pollModule(type);
      expect(typeof m.render.participant).toBe("function");
      expect(typeof m.render.display).toBe("function");
      expect(typeof m.render.hostResult).toBe("function");
    }
  });

  it("qa and idea_wall omit a presenter view; every vote-based type has one", () => {
    for (const type of ALL_TYPES) {
      const m = pollModule(type);
      if (m.storage === "questions") {
        expect(m.render.presenter, type).toBeUndefined();
      } else {
        expect(m.render.presenter, type).toBeDefined();
      }
    }
  });
});
