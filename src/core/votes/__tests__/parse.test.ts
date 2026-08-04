import { describe, it, expect } from "vitest";
import { parseVoteValue } from "../parse";

describe("parseVoteValue", () => {
  it("passes through a plain value unchanged", () => {
    expect(parseVoteValue("Париж")).toEqual(["Париж"]);
  });

  it("parses a JSON array of strings for multi-answer votes", () => {
    expect(parseVoteValue('["A","B"]')).toEqual(["A", "B"]);
  });

  it("falls back to the raw string on malformed JSON", () => {
    expect(parseVoteValue("[not json")).toEqual(["[not json"]);
  });

  it("falls back to the raw string when the array contains non-strings", () => {
    expect(parseVoteValue("[1,2,3]")).toEqual(["[1,2,3]"]);
  });

  it("falls back to the raw string for a JSON object (not an array)", () => {
    expect(parseVoteValue('{"a":1}')).toEqual(['{"a":1}']);
  });
});
