import { describe, it, expect } from "vitest";
import { modeModule } from "../modes";

describe("modeRegistry", () => {
  it("has both session modes registered", () => {
    expect(modeModule("conference").id).toBe("conference");
    expect(modeModule("quiz").id).toBe("quiz");
  });

  it("conference allows everything", () => {
    const c = modeModule("conference").capabilities;
    expect(c.pollTypes).toBe("all");
    expect(c.slideTypes).toBe("all");
    expect(c.qa).toBe(true);
    expect(c.sections).toBe(true);
    expect(c.hasLeaderboard).toBe(false);
  });

  it("quiz restricts to multiple_choice polls and pacing slides only", () => {
    const q = modeModule("quiz").capabilities;
    expect(q.pollTypes).toEqual(["multiple_choice"]);
    expect(q.slideTypes).toEqual(["reveal", "splash", "announcement"]);
    expect(q.qa).toBe(false);
    expect(q.sections).toBe(false);
    expect(q.requiresIdentity).toBe(true);
    expect(q.hasLeaderboard).toBe(true);
  });
});
