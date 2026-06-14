import { describe, it, expect } from "vitest";
import { bucketTimestamps } from "../timeline";

const ISO = (ms: number) => new Date(ms).toISOString();

describe("bucketTimestamps", () => {
  it("returns array of length n", () => {
    const result = bucketTimestamps([], 14);
    expect(result).toHaveLength(14);
  });

  it("empty array → all zeros", () => {
    expect(bucketTimestamps([], 14).every(v => v === 0)).toBe(true);
  });

  it("single timestamp → all zeros (no spread)", () => {
    expect(bucketTimestamps([ISO(0)], 14).every(v => v === 0)).toBe(true);
  });

  it("duration < 1s → all zeros", () => {
    const result = bucketTimestamps([ISO(0), ISO(500)], 14);
    expect(result.every(v => v === 0)).toBe(true);
  });

  it("two timestamps 10s apart → total count = 2", () => {
    const result = bucketTimestamps([ISO(0), ISO(10_000)], 14);
    expect(result.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("spreads timestamps evenly across buckets", () => {
    const n = 14;
    const duration = 14_000;
    // one timestamp per bucket (evenly spaced)
    const timestamps = Array.from({ length: n }, (_, i) =>
      ISO(Math.round((i / n) * duration))
    );
    const result = bucketTimestamps(timestamps, n);
    expect(result.reduce((a, b) => a + b, 0)).toBe(n);
    // each bucket gets 1
    result.forEach(v => expect(v).toBeGreaterThanOrEqual(1));
  });

  it("last timestamp lands in last bucket", () => {
    const result = bucketTimestamps([ISO(0), ISO(9_999), ISO(10_000)], 14);
    const total = result.reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
  });
});
