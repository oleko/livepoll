import { describe, it, expect } from "vitest";
import { getLimits, getPlanLimits, formatLimit, PLAN_DISPLAY_NAME } from "../limits";

function fakeAdmin(row: { plan: string } | null) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return { single: async () => ({ data: row }) };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getLimits", () => {
  it("free: 3 sessions/mo, 5 polls, 1 member, 30 participants", () => {
    const l = getLimits("free");
    expect(l.sessionsPerMonth).toBe(3);
    expect(l.pollsPerSession).toBe(5);
    expect(l.members).toBe(1);
    expect(l.maxParticipants).toBe(30);
  });

  it("unlimited plan has no caps anywhere", () => {
    const l = getLimits("unlimited");
    expect(l.sessionsPerMonth).toBe(Infinity);
    expect(l.pollsPerSession).toBe(Infinity);
    expect(l.members).toBe(Infinity);
    expect(l.maxParticipants).toBe(Infinity);
  });
});

describe("formatLimit", () => {
  it("renders Infinity as unlimited, everything else as the number", () => {
    expect(formatLimit(Infinity)).toBe("без ограничений");
    expect(formatLimit(5)).toBe("5");
  });
});

describe("PLAN_DISPLAY_NAME", () => {
  it("has a Russian label for every plan", () => {
    expect(Object.keys(PLAN_DISPLAY_NAME).sort()).toEqual(
      ["free", "pro", "starter", "team", "unlimited"].sort()
    );
  });
});

describe("getPlanLimits", () => {
  it("resolves an org's plan to its limits", async () => {
    const limits = await getPlanLimits(fakeAdmin({ plan: "pro" }), "org-1");
    expect(limits?.pollsPerSession).toBe(Infinity);
    expect(limits?.maxParticipants).toBe(500);
  });

  it("returns null when the org row is missing, so callers can skip the check", async () => {
    const limits = await getPlanLimits(fakeAdmin(null), "missing-org");
    expect(limits).toBeNull();
  });
});
