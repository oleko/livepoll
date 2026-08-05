import { describe, it, expect } from "vitest";
import { multiple_choice } from "../index";

describe("multiple_choice module", () => {
  describe("config.fromSettings", () => {
    it("defaults maxAnswers to 1 and quizMode to false with no settings", () => {
      const config = multiple_choice.config.fromSettings({ options: ["A", "B"], settings: {} });
      expect(config).toEqual({ options: ["A", "B"], maxAnswers: 1, quizMode: false, correctOption: undefined, explanation: undefined });
    });

    it("reads quiz_mode, correct_option and explanation from settings", () => {
      const config = multiple_choice.config.fromSettings({
        options: ["A", "B"],
        settings: { quiz_mode: true, correct_option: "A", explanation: "because A" },
      });
      expect(config.quizMode).toBe(true);
      expect(config.correctOption).toBe("A");
      expect(config.explanation).toBe("because A");
    });

    it("caps nothing itself — max_answers passes through as given", () => {
      const config = multiple_choice.config.fromSettings({ options: ["A", "B", "C"], settings: { max_answers: 3 } });
      expect(config.maxAnswers).toBe(3);
    });

    it("tolerates non-array options", () => {
      const config = multiple_choice.config.fromSettings({ options: null, settings: {} });
      expect(config.options).toEqual([]);
    });
  });

  describe("aggregate", () => {
    const config = multiple_choice.config.fromSettings({ options: ["Red", "Blue", "Green"], settings: {} });

    it("seeds all options at zero even with no votes", () => {
      const agg = multiple_choice.aggregate([], config);
      expect(agg.total).toBe(0);
      expect(agg.buckets).toEqual([
        { name: "Red", count: 0 },
        { name: "Blue", count: 0 },
        { name: "Green", count: 0 },
      ]);
    });

    it("tallies single-answer votes", () => {
      const agg = multiple_choice.aggregate([{ value: "Red" }, { value: "Red" }, { value: "Blue" }], config);
      expect(agg.total).toBe(3);
      expect(agg.counts).toEqual({ Red: 2, Blue: 1, Green: 0 });
    });

    it("tallies multi-answer JSON-array votes", () => {
      const agg = multiple_choice.aggregate([{ value: JSON.stringify(["Red", "Blue"]) }], config);
      expect(agg.counts.Red).toBe(1);
      expect(agg.counts.Blue).toBe(1);
    });

    it("sorts buckets by popularity descending when requested", () => {
      const agg = multiple_choice.aggregate(
        [{ value: "Blue" }, { value: "Blue" }, { value: "Red" }],
        config,
        { sortByPopularity: true }
      );
      expect(agg.buckets.map((b) => b.name)).toEqual(["Blue", "Red", "Green"]);
    });
  });

  describe("useDisplayLive", () => {
    it("passes quizReveal from ctx straight through as live.reveal", () => {
      const reveal = { correct_option: "Red", explanation: "because" };
      const live = multiple_choice.useDisplayLive!({ sessionId: "s1", pollId: "p1", quizReveal: reveal, votes: [] });
      expect(live).toEqual({ reveal });
    });

    it("is null when ctx carries no reveal", () => {
      const live = multiple_choice.useDisplayLive!({ sessionId: "s1", pollId: "p1", quizReveal: null, votes: [] });
      expect(live.reveal).toBeNull();
    });
  });

  it("declares its identity and render surfaces", () => {
    expect(multiple_choice.id).toBe("multiple_choice");
    expect(multiple_choice.meta.labelKey).toMatch(/^Org\./);
    expect(typeof multiple_choice.render.participant).toBe("function");
    expect(typeof multiple_choice.render.display).toBe("function");
    expect(typeof multiple_choice.render.hostResult).toBe("function");
    expect(typeof multiple_choice.render.presenter).toBe("function");
  });
});
