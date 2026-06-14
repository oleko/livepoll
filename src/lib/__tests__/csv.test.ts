import { describe, it, expect } from "vitest";
import { buildCsvRows } from "../csv";

describe("buildCsvRows — multiple_choice", () => {
  const poll = { type: "multiple_choice" };

  it("returns header + sorted rows with percentages", () => {
    const rows = buildCsvRows(poll, { "Да": 3, "Нет": 1 }, 4);
    expect(rows[0]).toEqual(["Вариант", "Голосов", "Процент"]);
    expect(rows[1]).toEqual(["Да", "3", "75%"]);
    expect(rows[2]).toEqual(["Нет", "1", "25%"]);
  });

  it("0% when voteCount is 0", () => {
    const rows = buildCsvRows(poll, { "Вариант А": 0 }, 0);
    expect(rows[1][2]).toBe("0%");
  });

  it("sorts by count descending", () => {
    const rows = buildCsvRows(poll, { "Б": 2, "А": 5 }, 7);
    expect(rows[1][0]).toBe("А");
    expect(rows[2][0]).toBe("Б");
  });
});

describe("buildCsvRows — like_dislike", () => {
  const poll = { type: "like_dislike" };

  it("returns likes and dislikes with percentages", () => {
    const rows = buildCsvRows(poll, { like: 6, dislike: 4 }, 10);
    expect(rows[0]).toEqual(["Вариант", "Голосов", "Процент"]);
    expect(rows[1][0]).toBe("👍 Нравится");
    expect(rows[1][1]).toBe("6");
    expect(rows[1][2]).toBe("60%");
    expect(rows[2][0]).toBe("👎 Не нравится");
    expect(rows[2][2]).toBe("40%");
  });

  it("handles missing like/dislike keys", () => {
    const rows = buildCsvRows(poll, {}, 0);
    expect(rows[1][1]).toBe("0");
  });
});

describe("buildCsvRows — word_cloud / emoji_cloud", () => {
  it("word_cloud: no percent column", () => {
    const rows = buildCsvRows({ type: "word_cloud" }, { "идея": 3, "план": 1 }, 4);
    expect(rows[0]).toEqual(["Значение", "Кол-во"]);
    expect(rows[1]).toEqual(["идея", "3"]);
  });

  it("emoji_cloud: same two-column format", () => {
    const rows = buildCsvRows({ type: "emoji_cloud" }, { "😊": 5 }, 5);
    expect(rows[0]).toEqual(["Значение", "Кол-во"]);
    expect(rows[1][0]).toBe("😊");
  });
});

describe("buildCsvRows — temperature / planning_poker", () => {
  it("uses standard three-column format", () => {
    const rows = buildCsvRows({ type: "temperature" }, { "5": 2, "3": 1 }, 3);
    expect(rows[0]).toEqual(["Вариант", "Голосов", "Процент"]);
  });
});
