import { describe, it, expect } from "vitest";
import { closeActivePoll, activateTargetPoll } from "../lifecycle";

type PollRow = {
  id: string;
  session_id: string;
  type: string;
  status: string;
  settings: Record<string, unknown> | null;
  sort_order: number;
  title: string;
  options: unknown[];
};

// Minimal fake of the subset of the supabase-js query builder that
// lifecycle.ts actually uses: .from("polls").select/update().eq()...
// terminated by .maybeSingle()/.single(), or awaited directly (the real
// client's builder is a thenable, so plain updates without a terminal
// selector still resolve).
function fakeAdmin(polls: PollRow[]) {
  function applyFilters(filters: [string, unknown][], orderCol: string | null, limitN: number | null) {
    let rows = polls.filter((r) => filters.every(([c, v]) => (r as unknown as Record<string, unknown>)[c] === v));
    if (orderCol) {
      rows = [...rows].sort(
        (a, b) => (a as unknown as Record<string, number>)[orderCol] - (b as unknown as Record<string, number>)[orderCol]
      );
    }
    if (limitN != null) rows = rows.slice(0, limitN);
    return rows;
  }

  function from() {
    const filters: [string, unknown][] = [];
    let orderCol: string | null = null;
    let limitN: number | null = null;
    let pendingUpdate: Partial<PollRow> | null = null;
    let selectCols: string[] | null = null;

    // Real supabase-js returns fresh, column-projected data on every
    // query — never a live reference into the table. Cloning (and
    // projecting) here matters: without it, a row returned by an earlier
    // SELECT would silently mutate in the test's hands once a later
    // UPDATE runs, masking bugs the real client can't produce.
    function project(row: PollRow): Partial<PollRow> {
      if (!selectCols) return { ...row };
      const out: Partial<PollRow> = {};
      for (const c of selectCols) (out as Record<string, unknown>)[c] = (row as unknown as Record<string, unknown>)[c];
      return out;
    }

    const chain = {
      select(cols?: string) {
        selectCols = cols ? cols.split(",").map((c) => c.trim()) : null;
        return chain;
      },
      update(patch: Partial<PollRow>) { pendingUpdate = patch; return chain; },
      eq(col: string, val: unknown) { filters.push([col, val]); return chain; },
      order(col: string) { orderCol = col; return chain; },
      limit(n: number) { limitN = n; return chain; },
      async maybeSingle() {
        const rows = applyFilters(filters, orderCol, limitN);
        return { data: rows[0] ? project(rows[0]) : null };
      },
      async single() {
        const rows = applyFilters(filters, orderCol, limitN);
        return { data: rows[0] ? project(rows[0]) : null };
      },
      then(resolve: (v: { data: unknown }) => void) {
        const rows = applyFilters(filters, orderCol, limitN);
        if (pendingUpdate) {
          for (const row of rows) Object.assign(row, pendingUpdate);
        }
        resolve({ data: selectCols ? rows.map(project) : null });
      },
    };
    return chain;
  }

  return { from } as unknown as Parameters<typeof closeActivePoll>[0];
}

function poll(overrides: Partial<PollRow>): PollRow {
  return {
    id: "p1",
    session_id: "s1",
    type: "multiple_choice",
    status: "draft",
    settings: null,
    sort_order: 0,
    title: "Q",
    options: [],
    ...overrides,
  };
}

describe("closeActivePoll", () => {
  it("closes the active poll and returns its previous id + settings", async () => {
    const polls = [poll({ id: "p1", status: "active", settings: { quiz_mode: true } })];
    const admin = fakeAdmin(polls);

    const prev = await closeActivePoll(admin, "s1");

    expect(prev).toEqual({ id: "p1", settings: { quiz_mode: true } });
    expect(polls[0].status).toBe("closed");
  });

  it("is a no-op when nothing is active — the normal steady state, not an error", async () => {
    const polls = [poll({ id: "p1", status: "closed" })];
    const admin = fakeAdmin(polls);

    const prev = await closeActivePoll(admin, "s1");

    expect(prev).toBeNull();
    expect(polls[0].status).toBe("closed");
  });
});

describe("activateTargetPoll — kind: id", () => {
  it("activates a draft poll by id", async () => {
    const polls = [poll({ id: "p1", status: "draft", settings: { foo: "bar" } })];
    const admin = fakeAdmin(polls);

    const outcome = await activateTargetPoll(admin, "s1", { kind: "id", pollId: "p1" });

    expect(outcome.status).toBe("activated");
    if (outcome.status === "activated") {
      expect(outcome.poll.id).toBe("p1");
      expect(outcome.poll.settings).toMatchObject({ foo: "bar", activated_at: expect.any(String) });
    }
    expect(polls[0].status).toBe("active");
  });

  it("returns not_found for a missing poll", async () => {
    const admin = fakeAdmin([]);
    const outcome = await activateTargetPoll(admin, "s1", { kind: "id", pollId: "missing" });
    expect(outcome.status).toBe("not_found");
  });

  it("returns raced when the poll is no longer draft (double-click / concurrent activation)", async () => {
    const polls = [poll({ id: "p1", status: "active" })];
    const admin = fakeAdmin(polls);

    const outcome = await activateTargetPoll(admin, "s1", { kind: "id", pollId: "p1" });

    expect(outcome.status).toBe("raced");
  });
});

describe("activateTargetPoll — kind: nextDraft", () => {
  it("activates the next draft poll of the given type in sort order", async () => {
    const polls = [
      poll({ id: "p1", status: "closed", sort_order: 0 }),
      poll({ id: "p2", status: "draft", sort_order: 1, settings: { quiz_mode: true } }),
      poll({ id: "p3", status: "draft", sort_order: 2, settings: { quiz_mode: true } }),
    ];
    const admin = fakeAdmin(polls);

    const outcome = await activateTargetPoll(admin, "s1", {
      kind: "nextDraft",
      type: "multiple_choice",
      requireQuizMode: true,
    });

    expect(outcome.status).toBe("activated");
    if (outcome.status === "activated") expect(outcome.poll.id).toBe("p2");
    expect(polls[1].status).toBe("active");
    expect(polls[2].status).toBe("draft");
  });

  it("skips non-quiz drafts and closes them when requireQuizMode is set", async () => {
    const polls = [
      poll({ id: "p1", status: "draft", sort_order: 0, settings: {} }),
      poll({ id: "p2", status: "draft", sort_order: 1, settings: { quiz_mode: true } }),
    ];
    const admin = fakeAdmin(polls);

    const outcome = await activateTargetPoll(admin, "s1", {
      kind: "nextDraft",
      type: "multiple_choice",
      requireQuizMode: true,
    });

    expect(outcome.status).toBe("activated");
    if (outcome.status === "activated") expect(outcome.poll.id).toBe("p2");
    expect(polls[0].status).toBe("closed");
  });

  it("returns finished (not_found) when no draft poll remains", async () => {
    const polls = [poll({ id: "p1", status: "closed" })];
    const admin = fakeAdmin(polls);

    const outcome = await activateTargetPoll(admin, "s1", {
      kind: "nextDraft",
      type: "multiple_choice",
      requireQuizMode: true,
    });

    expect(outcome.status).toBe("not_found");
  });

  it("does not re-activate a poll that already advanced (no double-activation on repeat calls)", async () => {
    // This fake is single-threaded, so it can't reproduce the exact
    // interleaving of a real concurrent race (two SELECTs both reading
    // "draft" before either UPDATE commits) — the "kind: id" raced test
    // above exercises that CAS path directly. What this test guards is
    // the resulting invariant: once a poll has been advanced past draft,
    // a second call must never find and re-activate it.
    const polls = [poll({ id: "p1", status: "draft", settings: { quiz_mode: true } })];
    const admin = fakeAdmin(polls);

    const first = await activateTargetPoll(admin, "s1", {
      kind: "nextDraft",
      type: "multiple_choice",
      requireQuizMode: true,
    });
    expect(first.status).toBe("activated");

    const second = await activateTargetPoll(admin, "s1", {
      kind: "nextDraft",
      type: "multiple_choice",
      requireQuizMode: true,
    });
    expect(second.status).toBe("not_found");
  });
});
