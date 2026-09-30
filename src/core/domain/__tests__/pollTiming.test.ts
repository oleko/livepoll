import { describe, it, expect } from "vitest";
import { pollDeadline, isPollExpired, pollSecondsLeft } from "../pollTiming";

const T0 = Date.parse("2026-09-30T12:00:00.000Z");

describe("pollDeadline", () => {
  it("adds the duration to the activation time", () => {
    expect(pollDeadline({ duration: 60, activated_at: "2026-09-30T12:00:00.000Z" }))
      .toBe(T0 + 60_000);
  });

  it("is null when the poll is not timed", () => {
    expect(pollDeadline({ activated_at: "2026-09-30T12:00:00.000Z" })).toBeNull();
    expect(pollDeadline({ duration: 60 })).toBeNull();
    expect(pollDeadline(null)).toBeNull();
    expect(pollDeadline(undefined)).toBeNull();
  });

  it("is null for a non-positive duration or an unparsable timestamp", () => {
    expect(pollDeadline({ duration: 0, activated_at: "2026-09-30T12:00:00.000Z" })).toBeNull();
    expect(pollDeadline({ duration: -5, activated_at: "2026-09-30T12:00:00.000Z" })).toBeNull();
    expect(pollDeadline({ duration: 60, activated_at: "не дата" })).toBeNull();
  });
});

describe("isPollExpired", () => {
  const timed = { duration: 60, activated_at: "2026-09-30T12:00:00.000Z" };

  it("is false before the deadline and true at or after it", () => {
    expect(isPollExpired(timed, T0 + 59_000)).toBe(false);
    expect(isPollExpired(timed, T0 + 60_000)).toBe(true);
    expect(isPollExpired(timed, T0 + 600_000)).toBe(true);
  });

  it("never expires an untimed poll", () => {
    expect(isPollExpired({ activated_at: "2026-09-30T12:00:00.000Z" }, T0 + 10_000_000)).toBe(false);
  });
});

describe("pollSecondsLeft", () => {
  const timed = { duration: 60, activated_at: "2026-09-30T12:00:00.000Z" };

  it("counts down and floors at zero", () => {
    expect(pollSecondsLeft(timed, T0)).toBe(60);
    expect(pollSecondsLeft(timed, T0 + 30_500)).toBe(30);
    expect(pollSecondsLeft(timed, T0 + 120_000)).toBe(0);
  });

  it("is null for an untimed poll", () => {
    expect(pollSecondsLeft({ duration: 60 }, T0)).toBeNull();
  });
});
