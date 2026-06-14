import { describe, it, expect } from "vitest";
import { getLimits, formatLimit, PLAN_DISPLAY_NAME } from "../limits";

describe("getLimits", () => {
  it("free: 3 sessions/mo, 5 polls, 1 member, 30 participants", () => {
    const l = getLimits("free");
    expect(l.sessionsPerMonth).toBe(3);
    expect(l.pollsPerSession).toBe(5);
    expect(l.members).toBe(1);
    expect(l.maxParticipants).toBe(30);
  });

  it("starter: unlimited sessions, 10 polls, 1 member, 100 participants", () => {
    const l = getLimits("starter");
    expect(l.sessionsPerMonth).toBe(Infinity);
    expect(l.pollsPerSession).toBe(10);
    expect(l.members).toBe(1);
    expect(l.maxParticipants).toBe(100);
  });

  it("pro: unlimited sessions, unlimited polls, 500 participants", () => {
    const l = getLimits("pro");
    expect(l.sessionsPerMonth).toBe(Infinity);
    expect(l.pollsPerSession).toBe(Infinity);
    expect(l.maxParticipants).toBe(500);
  });

  it("team: 5 members, unlimited participants", () => {
    const l = getLimits("team");
    expect(l.members).toBe(5);
    expect(l.maxParticipants).toBe(Infinity);
  });

  it("unlimited: all limits are Infinity", () => {
    const l = getLimits("unlimited");
    expect(l.sessionsPerMonth).toBe(Infinity);
    expect(l.pollsPerSession).toBe(Infinity);
    expect(l.members).toBe(Infinity);
    expect(l.maxParticipants).toBe(Infinity);
  });

  it("unknown plan falls back to free limits", () => {
    const l = getLimits("unknown" as never);
    expect(l.sessionsPerMonth).toBe(3);
  });
});

describe("formatLimit", () => {
  it("Infinity → 'без ограничений'", () => {
    expect(formatLimit(Infinity)).toBe("без ограничений");
  });

  it("finite number → string", () => {
    expect(formatLimit(5)).toBe("5");
    expect(formatLimit(100)).toBe("100");
  });
});

describe("PLAN_DISPLAY_NAME", () => {
  it("has all 5 plans", () => {
    expect(PLAN_DISPLAY_NAME.free).toBeDefined();
    expect(PLAN_DISPLAY_NAME.starter).toBeDefined();
    expect(PLAN_DISPLAY_NAME.pro).toBeDefined();
    expect(PLAN_DISPLAY_NAME.team).toBeDefined();
    expect(PLAN_DISPLAY_NAME.unlimited).toBeDefined();
  });
});
