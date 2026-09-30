import { describe, it, expect } from "vitest";
import { parseVoteInput, loadPollForVote } from "../vote";

const TOKEN = "11111111-2222-4333-8444-555555555555";

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

type PollRow = {
  id: string;
  session_id: string;
  type: string;
  status: string;
  settings: Record<string, unknown> | null;
};

// Same shape of fake as lifecycle.test.ts: only the slice of the supabase
// query builder that loadPollForVote uses — .from().select().eq().single().
function fakeAdmin(polls: PollRow[]) {
  function from() {
    const filters: [string, unknown][] = [];
    const chain = {
      select() { return chain; },
      eq(col: string, val: unknown) { filters.push([col, val]); return chain; },
      async single() {
        const row = polls.find((r) => filters.every(([c, v]) => (r as unknown as Record<string, unknown>)[c] === v));
        return row ? { data: { ...row }, error: null } : { data: null, error: { message: "not found" } };
      },
    };
    return chain;
  }
  return { from } as unknown as Parameters<typeof loadPollForVote>[0];
}

describe("parseVoteInput", () => {
  it("accepts a plain single value", () => {
    const r = parseVoteInput(fd({ poll_id: "p1", voter_token: TOKEN, value: " Да " }));
    expect(r).toEqual({ pollId: "p1", voterToken: TOKEN, value: "Да", parsedValues: ["Да"] });
  });

  it("parses a multi-answer JSON array", () => {
    const r = parseVoteInput(fd({ poll_id: "p1", voter_token: TOKEN, value: '["A","B"]' }));
    expect("error" in r).toBe(false);
    if (!("error" in r)) expect(r.parsedValues).toEqual(["A", "B"]);
  });

  it("rejects a non-uuid voter token", () => {
    expect(parseVoteInput(fd({ poll_id: "p1", voter_token: "not-a-uuid", value: "Да" })))
      .toEqual({ error: "Неверные данные" });
  });

  it("rejects missing fields", () => {
    expect(parseVoteInput(fd({ poll_id: "p1", voter_token: TOKEN, value: "   " })))
      .toEqual({ error: "Неверные данные" });
  });

  it("rejects malformed JSON that looks like an array", () => {
    expect(parseVoteInput(fd({ poll_id: "p1", voter_token: TOKEN, value: '["A"' })))
      .toEqual({ error: "Неверные данные" });
  });

  it("rejects an empty array", () => {
    expect(parseVoteInput(fd({ poll_id: "p1", voter_token: TOKEN, value: "[]" })))
      .toEqual({ error: "Неверные данные" });
  });

  it("caps scalar length at 500 and payload length at 2000", () => {
    expect(parseVoteInput(fd({ poll_id: "p1", voter_token: TOKEN, value: "x".repeat(501) })))
      .toEqual({ error: "Слишком длинный ответ" });
    expect(parseVoteInput(fd({ poll_id: "p1", voter_token: TOKEN, value: "x".repeat(2001) })))
      .toEqual({ error: "Слишком длинный ответ" });
  });

  it("caps each element of a multi-answer array at 200", () => {
    const value = JSON.stringify(["ok", "y".repeat(201)]);
    expect(parseVoteInput(fd({ poll_id: "p1", voter_token: TOKEN, value })))
      .toEqual({ error: "Неверные данные" });
  });
});

describe("loadPollForVote", () => {
  const active: PollRow = { id: "p1", session_id: "s1", type: "multiple_choice", status: "active", settings: null };

  it("loads an active poll", async () => {
    const r = await loadPollForVote(fakeAdmin([active]), "p1", ["A"]);
    expect(r).toEqual({ sessionId: "s1", settings: null, maxAnswers: 1 });
  });

  // The bug this guards: a participant whose screen missed the `closed`
  // broadcast could still submit, moving a result the host had already shown.
  it("refuses a closed poll", async () => {
    const closed = { ...active, status: "closed" };
    expect(await loadPollForVote(fakeAdmin([closed]), "p1", ["A"]))
      .toEqual({ error: "Голосование завершено" });
  });

  it("refuses a draft poll", async () => {
    const draft = { ...active, status: "draft" };
    expect(await loadPollForVote(fakeAdmin([draft]), "p1", ["A"]))
      .toEqual({ error: "Голосование завершено" });
  });

  it("refuses a poll that does not exist", async () => {
    expect(await loadPollForVote(fakeAdmin([]), "missing", ["A"]))
      .toEqual({ error: "Опрос не найден" });
  });

  it("enforces max_answers", async () => {
    const multi = { ...active, settings: { max_answers: 2 } };
    expect(await loadPollForVote(fakeAdmin([multi]), "p1", ["A", "B", "C"]))
      .toEqual({ error: "Можно выбрать не более 2 вариантов" });
    expect(await loadPollForVote(fakeAdmin([multi]), "p1", ["A", "B"]))
      .toMatchObject({ sessionId: "s1", maxAnswers: 2 });
  });

  // The projector used to be the only thing that closed a timed poll, so with
  // it shut the poll stayed "active" and kept taking votes indefinitely.
  it("refuses a vote after the timer has run out and asks for a close", async () => {
    const expired = {
      ...active,
      settings: { duration: 30, activated_at: new Date(Date.now() - 60_000).toISOString() },
    };
    expect(await loadPollForVote(fakeAdmin([expired]), "p1", ["A"]))
      .toEqual({ error: "Время вышло", expired: true });
  });

  it("still accepts a vote while the timer is running", async () => {
    const running = {
      ...active,
      settings: { duration: 300, activated_at: new Date(Date.now() - 5_000).toISOString() },
    };
    expect(await loadPollForVote(fakeAdmin([running]), "p1", ["A"]))
      .toMatchObject({ sessionId: "s1" });
  });

  it("never expires an untimed poll", async () => {
    const untimed = { ...active, settings: { activated_at: new Date(0).toISOString() } };
    expect(await loadPollForVote(fakeAdmin([untimed]), "p1", ["A"]))
      .toMatchObject({ sessionId: "s1" });
  });

  it("caps word length for word_cloud only", async () => {
    const cloud = { ...active, type: "word_cloud" };
    expect(await loadPollForVote(fakeAdmin([cloud]), "p1", ["w".repeat(51)]))
      .toEqual({ error: "Слишком длинное слово" });
    expect(await loadPollForVote(fakeAdmin([active]), "p1", ["w".repeat(51)]))
      .toMatchObject({ sessionId: "s1" });
  });
});
