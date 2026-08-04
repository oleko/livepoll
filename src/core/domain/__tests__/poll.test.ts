import { describe, it, expect } from "vitest";
import { toPublicPoll } from "../poll";

describe("toPublicPoll", () => {
  it("strips correct_option and explanation from settings", () => {
    const raw = {
      id: "p1",
      title: "Столица Франции?",
      type: "multiple_choice" as const,
      options: ["Париж", "Лондон", "Берлин"],
      status: "active",
      settings: {
        quiz_mode: true,
        correct_option: "Париж",
        explanation: "Столица Франции — Париж.",
        duration: 30,
      },
    };

    const pub = toPublicPoll(raw);

    expect(pub.settings.correct_option).toBeUndefined();
    expect(pub.settings.explanation).toBeUndefined();
    expect(pub.settings.duration).toBe(30);
    expect(pub.settings.quiz_mode).toBe(true);
    expect(pub.id).toBe("p1");
    expect(pub.title).toBe(raw.title);
  });

  it("does not mutate the source row's settings object", () => {
    const settings = { correct_option: "A", explanation: "because" };
    const raw = { id: "p2", title: "t", type: "multiple_choice" as const, options: ["A", "B"], status: "active", settings };

    toPublicPoll(raw);

    expect(settings.correct_option).toBe("A");
    expect(settings.explanation).toBe("because");
  });

  it("handles missing settings gracefully", () => {
    const raw = { id: "p3", title: "t", type: "temperature" as const, options: [], status: "draft" };
    const pub = toPublicPoll(raw);
    expect(pub.settings).toEqual({});
  });
});
