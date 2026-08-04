/**
 * Multi-answer votes are stored as a JSON-array string (e.g. multiple_choice
 * with max_answers > 1); single-answer votes are stored as the raw value.
 * This is the one implementation — it used to be written independently in
 * DisplayScreen, PresenterScreen, and the session page's server-side
 * aggregation.
 *
 * Malformed input falls back to treating the whole string as one value
 * rather than throwing — this is a read-path parser for values that already
 * passed submitVote's stricter validation, not a validator itself.
 */
export function parseVoteValue(value: string): string[] {
  if (!value.startsWith("[")) return [value];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed;
    }
    return [value];
  } catch {
    return [value];
  }
}
