import { describe, it, expect } from "vitest";
import { planning_poker } from "../index";

describe("planning_poker module", () => {
  describe("config.fromSettings", () => {
    it("has no configurable settings — always returns an empty config", () => {
      expect(planning_poker.config.fromSettings({ options: [], settings: {} })).toEqual({});
    });
  });

  describe("aggregate", () => {
    it("does NOT seed zero-count buckets — unlike multiple_choice, unchosen cards don't appear", () => {
      const agg = planning_poker.aggregate([{ value: "5" }], {});
      expect(agg.buckets).toEqual([{ name: "5", count: 1 }]);
    });

    it("tallies votes by card value (counts still carries every seeded key at zero — only buckets filters them)", () => {
      const agg = planning_poker.aggregate([{ value: "8" }, { value: "8" }, { value: "?" }], {});
      expect(agg.counts["8"]).toBe(2);
      expect(agg.counts["?"]).toBe(1);
      expect(agg.total).toBe(3);
    });

    it("sorts by popularity only when requested", () => {
      const votes = [{ value: "1" }, { value: "13" }, { value: "13" }];
      const unsorted = planning_poker.aggregate(votes, {});
      const sorted = planning_poker.aggregate(votes, {}, { sortByPopularity: true });
      expect(sorted.buckets.map((b) => b.name)).toEqual(["13", "1"]);
      expect(unsorted.buckets.map((b) => b.name)).not.toEqual(sorted.buckets.map((b) => b.name));
    });
  });

  it("declares its identity and render surfaces, with useDisplayLive for the reveal gate", () => {
    expect(planning_poker.id).toBe("planning_poker");
    expect(planning_poker.meta.labelKey).toMatch(/^Org\./);
    expect(typeof planning_poker.render.participant).toBe("function");
    expect(typeof planning_poker.render.display).toBe("function");
    expect(typeof planning_poker.render.hostResult).toBe("function");
    expect(typeof planning_poker.render.presenter).toBe("function");
    expect(typeof planning_poker.useDisplayLive).toBe("function");
  });
});
