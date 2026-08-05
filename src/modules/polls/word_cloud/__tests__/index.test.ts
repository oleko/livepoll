import { describe, it, expect } from "vitest";
import { word_cloud } from "../index";

describe("word_cloud module", () => {
  describe("config.fromSettings", () => {
    it("has no configurable settings — always returns an empty config", () => {
      expect(word_cloud.config.fromSettings({ options: [], settings: { anything: true } })).toEqual({});
    });
  });

  describe("aggregate", () => {
    it("normalizes case and whitespace before counting", () => {
      const agg = word_cloud.aggregate([{ value: "Cat" }, { value: " cat " }, { value: "CAT" }], {});
      expect(agg.counts).toEqual({ cat: 3 });
      expect(agg.total).toBe(3);
    });

    it("drops empty/whitespace-only submissions", () => {
      const agg = word_cloud.aggregate([{ value: "  " }, { value: "dog" }], {});
      expect(agg.counts).toEqual({ dog: 1 });
    });

    it("always sorts buckets by popularity descending, regardless of opts", () => {
      const agg = word_cloud.aggregate(
        [{ value: "b" }, { value: "b" }, { value: "a" }, { value: "c" }, { value: "c" }, { value: "c" }],
        {}
      );
      expect(agg.buckets.map((b) => b.name)).toEqual(["c", "b", "a"]);
    });

    it("has no seeded zero-count buckets — unlike multiple_choice, there is no fixed option list", () => {
      const agg = word_cloud.aggregate([], {});
      expect(agg.buckets).toEqual([]);
      expect(agg.total).toBe(0);
    });
  });

  it("declares its identity and render surfaces", () => {
    expect(word_cloud.id).toBe("word_cloud");
    expect(word_cloud.meta.labelKey).toMatch(/^Org\./);
    expect(typeof word_cloud.render.participant).toBe("function");
    expect(typeof word_cloud.render.display).toBe("function");
    expect(typeof word_cloud.render.hostResult).toBe("function");
    expect(typeof word_cloud.render.presenter).toBe("function");
    expect(typeof word_cloud.useDisplayLive).toBe("function");
  });
});
