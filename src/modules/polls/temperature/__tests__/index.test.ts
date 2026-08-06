import { describe, it, expect } from "vitest";
import { temperature } from "../index";

describe("temperature module", () => {
  describe("config.fromSettings", () => {
    it("has no configurable settings — always returns an empty config", () => {
      expect(temperature.config.fromSettings({ options: [], settings: {} })).toEqual({});
    });
  });

  describe("aggregate", () => {
    it("seeds all 5 buckets at zero even with no votes", () => {
      const agg = temperature.aggregate([], {});
      expect(agg.buckets).toEqual([
        { name: "1", count: 0 }, { name: "2", count: 0 }, { name: "3", count: 0 },
        { name: "4", count: 0 }, { name: "5", count: 0 },
      ]);
    });

    it("tallies votes by scale value", () => {
      const agg = temperature.aggregate([{ value: "5" }, { value: "5" }, { value: "1" }], {});
      expect(agg.counts).toEqual({ "1": 1, "2": 0, "3": 0, "4": 0, "5": 2 });
      expect(agg.total).toBe(3);
    });
  });

  it("declares its identity and render surfaces (no useDisplayLive)", () => {
    expect(temperature.id).toBe("temperature");
    expect(temperature.meta.labelKey).toMatch(/^Org\./);
    expect(typeof temperature.render.participant).toBe("function");
    expect(typeof temperature.render.display).toBe("function");
    expect(typeof temperature.render.hostResult).toBe("function");
    expect(typeof temperature.render.presenter).toBe("function");
    expect(temperature.useDisplayLive).toBeUndefined();
  });
});
