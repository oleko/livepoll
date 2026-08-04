import { describe, it, expect } from "vitest";
import { aggregate } from "../aggregate";

describe("aggregate", () => {
  it("counts single-answer votes", () => {
    const result = aggregate([{ value: "A" }, { value: "B" }, { value: "A" }]);
    expect(result.total).toBe(3);
    expect(result.counts).toEqual({ A: 2, B: 1 });
  });

  it("splits multi-answer JSON-array votes across their options", () => {
    const result = aggregate([{ value: '["A","B"]' }, { value: "A" }]);
    expect(result.counts).toEqual({ A: 2, B: 1 });
    expect(result.total).toBe(2); // total counts vote rows, not option selections
  });

  it("seeds keys at zero and keeps them when keepZero is set (multiple_choice behavior)", () => {
    const result = aggregate([{ value: "A" }], { seedKeys: ["A", "B", "C"], keepZero: true });
    expect(result.buckets).toEqual(
      expect.arrayContaining([{ name: "A", count: 1 }, { name: "B", count: 0 }, { name: "C", count: 0 }])
    );
    expect(result.buckets).toHaveLength(3);
  });

  it("drops zero-count seeded keys when keepZero is not set (planning_poker behavior)", () => {
    const result = aggregate([{ value: "5" }], { seedKeys: ["1", "2", "3", "5"] });
    expect(result.buckets).toEqual([{ name: "5", count: 1 }]);
  });

  it("normalizes values and skips falsy results (word_cloud behavior)", () => {
    const result = aggregate(
      [{ value: "  Paris " }, { value: "paris" }, { value: "   " }],
      { normalize: (v) => v.toLowerCase().trim() }
    );
    expect(result.counts).toEqual({ paris: 2 });
  });

  it("returns no buckets for an empty vote list", () => {
    const result = aggregate([]);
    expect(result.total).toBe(0);
    expect(result.buckets).toEqual([]);
  });
});
