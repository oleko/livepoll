import { describe, it, expect } from "vitest";
import { like_dislike } from "../index";

describe("like_dislike module", () => {
  describe("config.fromSettings", () => {
    it("has no configurable settings — always returns an empty config", () => {
      expect(like_dislike.config.fromSettings({ options: [], settings: {} })).toEqual({});
    });
  });

  describe("aggregate", () => {
    it("seeds both like and dislike at zero even with no votes", () => {
      const agg = like_dislike.aggregate([], {});
      expect(agg.counts).toEqual({ like: 0, dislike: 0 });
      expect(agg.total).toBe(0);
    });

    it("tallies like/dislike votes", () => {
      const agg = like_dislike.aggregate([{ value: "like" }, { value: "like" }, { value: "dislike" }], {});
      expect(agg.counts).toEqual({ like: 2, dislike: 1 });
      expect(agg.total).toBe(3);
    });
  });

  it("declares its identity and render surfaces (no useDisplayLive)", () => {
    expect(like_dislike.id).toBe("like_dislike");
    expect(like_dislike.meta.labelKey).toMatch(/^Org\./);
    expect(typeof like_dislike.render.participant).toBe("function");
    expect(typeof like_dislike.render.display).toBe("function");
    expect(typeof like_dislike.render.hostResult).toBe("function");
    expect(typeof like_dislike.render.presenter).toBe("function");
    expect(like_dislike.useDisplayLive).toBeUndefined();
  });
});
