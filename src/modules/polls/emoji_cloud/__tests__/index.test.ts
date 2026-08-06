import { describe, it, expect } from "vitest";
import { emoji_cloud } from "../index";

describe("emoji_cloud module", () => {
  describe("config.fromSettings", () => {
    it("has no configurable settings — always returns an empty config", () => {
      expect(emoji_cloud.config.fromSettings({ options: [], settings: { anything: true } })).toEqual({});
    });
  });

  describe("aggregate", () => {
    it("tallies exact emoji values without normalization", () => {
      const agg = emoji_cloud.aggregate([{ value: "🔥" }, { value: "🔥" }, { value: "👍" }], {});
      expect(agg.counts).toEqual({ "🔥": 2, "👍": 1 });
      expect(agg.total).toBe(3);
    });

    it("always sorts buckets by popularity descending", () => {
      const agg = emoji_cloud.aggregate(
        [{ value: "😊" }, { value: "🎉" }, { value: "🎉" }, { value: "🎉" }],
        {}
      );
      expect(agg.buckets.map((b) => b.name)).toEqual(["🎉", "😊"]);
    });

    it("has no seeded zero-count buckets", () => {
      const agg = emoji_cloud.aggregate([], {});
      expect(agg.buckets).toEqual([]);
    });
  });

  it("declares its identity and render surfaces (no useDisplayLive — purely a function of agg)", () => {
    expect(emoji_cloud.id).toBe("emoji_cloud");
    expect(emoji_cloud.meta.labelKey).toMatch(/^Org\./);
    expect(typeof emoji_cloud.render.participant).toBe("function");
    expect(typeof emoji_cloud.render.display).toBe("function");
    expect(typeof emoji_cloud.render.hostResult).toBe("function");
    expect(typeof emoji_cloud.render.presenter).toBe("function");
    expect(emoji_cloud.useDisplayLive).toBeUndefined();
  });
});
