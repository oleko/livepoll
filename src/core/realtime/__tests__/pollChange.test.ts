import { describe, it, expect } from "vitest";
import { classifyPollChange } from "../pollChange";
import type { PollChangeEvent } from "../events";
import type { PublicPoll } from "@/core/domain/poll";

const poll = { id: "p1", title: "T", type: "multiple_choice", options: [], status: "active", settings: {} } as unknown as PublicPoll;

describe("classifyPollChange", () => {
  it("maps activation", () => {
    expect(classifyPollChange({ type: "activated", poll })).toEqual({ kind: "activated", poll });
  });

  it("maps an edit to the whole poll, not a subset of its fields", () => {
    const action = classifyPollChange({ type: "poll_updated", poll });
    expect(action).toEqual({ kind: "updated", poll });
  });

  it("maps a plain close", () => {
    expect(classifyPollChange({ type: "closed", poll_id: "p1" }))
      .toEqual({ kind: "closed", pollId: "p1", quizReveal: null, showResult: false });
  });

  it("carries the quiz reveal without implying show_result", () => {
    const reveal = { correct_option: "A", explanation: "потому что" };
    expect(classifyPollChange({ type: "closed", poll_id: "p1", quiz_reveal: reveal }))
      .toEqual({ kind: "closed", pollId: "p1", quizReveal: reveal, showResult: false });
  });

  it("carries show_result", () => {
    expect(classifyPollChange({ type: "closed", poll_id: "p1", show_result: true }))
      .toEqual({ kind: "closed", pollId: "p1", quizReveal: null, showResult: true });
  });

  it("maps hiding from the display", () => {
    expect(classifyPollChange({ type: "display_hidden" })).toEqual({ kind: "hidden" });
  });

  it("is total over the event union", () => {
    const events: PollChangeEvent[] = [
      { type: "activated", poll },
      { type: "poll_updated", poll },
      { type: "closed", poll_id: "p1" },
      { type: "display_hidden" },
    ];
    for (const e of events) expect(classifyPollChange(e).kind).toBeTruthy();
  });
});
