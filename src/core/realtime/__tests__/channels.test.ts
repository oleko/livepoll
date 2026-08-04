import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { CHANNELS, topic } from "../channels";

describe("topic()", () => {
  it("produces the exact wire-format strings the rest of the system depends on", () => {
    expect(topic("sessionPolls", "abc")).toBe("session-polls:abc");
    expect(topic("sessionSlides", "abc")).toBe("session-slides:abc");
    expect(topic("sessionQuestions", "abc")).toBe("session-questions:abc");
    expect(topic("pollVotes", "abc")).toBe("poll-votes:abc");
    expect(topic("sessionBuzz", "abc")).toBe("session-buzz:abc");
  });

  it("has exactly the five channels the app uses — adding one here is a deliberate act", () => {
    expect(Object.keys(CHANNELS).sort()).toEqual(
      ["pollVotes", "sessionBuzz", "sessionPolls", "sessionQuestions", "sessionSlides"].sort()
    );
  });
});

describe("orphan channel regression", () => {
  // Before the typed realtime rewrite, PresenterScreen.tsx and QuizTab.tsx
  // subscribed to "presenter-polls:*", "presenter-slides:*", "presenter-qa:*",
  // "presenter-votes:*" and "champ-lobby-*" — topics no server code ever
  // published to, so those two screens were silently realtime-dead. Typed
  // channels make writing NEW code against these names a compile error;
  // this scans the actual source tree so the raw strings creeping back in
  // via a template literal (which the type system can't see through) fails
  // the test suite instead of shipping silently.
  const bannedSubstrings = ["presenter-polls", "presenter-slides", "presenter-qa", "presenter-votes", "champ-lobby"];
  const srcDir = path.resolve(__dirname, "../../../");

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        if (entry === "node_modules" || entry === ".next" || entry === "realtime") continue;
        walk(full, out);
      } else if (/\.(ts|tsx)$/.test(entry) && !entry.includes(".test.")) {
        out.push(full);
      }
    }
    return out;
  }

  it("no source file references a banned legacy topic string", () => {
    // Skips src/core/realtime itself — its own doc comments explain what it
    // replaced, which legitimately mentions the banned names as prose, not code.
    const offenders: string[] = [];
    for (const file of walk(srcDir)) {
      const content = readFileSync(file, "utf8");
      for (const banned of bannedSubstrings) {
        if (content.includes(banned)) offenders.push(`${file}: "${banned}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
