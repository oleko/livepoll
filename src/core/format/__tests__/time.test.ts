import { describe, it, expect } from "vitest";
import { formatClock } from "../time";

describe("formatClock", () => {
  it("returns bare seconds under a minute", () => {
    expect(formatClock(0)).toBe("0");
    expect(formatClock(5)).toBe("5");
    expect(formatClock(59)).toBe("59");
  });

  it("returns M:SS at and above a minute", () => {
    expect(formatClock(60)).toBe("1:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(599)).toBe("9:59");
    expect(formatClock(600)).toBe("10:00");
  });

  it("clamps negative input to 0", () => {
    expect(formatClock(-5)).toBe("0");
  });

  it("floors fractional seconds", () => {
    expect(formatClock(59.9)).toBe("59");
    expect(formatClock(60.9)).toBe("1:00");
  });
});
