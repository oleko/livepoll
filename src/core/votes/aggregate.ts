import { parseVoteValue } from "./parse";

export type AggregateBucket = { name: string; count: number };
export type Aggregate = {
  total: number;
  counts: Record<string, number>;
  buckets: AggregateBucket[];
};

export type AggregateSpec = {
  /** Pre-seed these keys at 0 so they appear even with no votes yet (e.g. all poll options). */
  seedKeys?: string[];
  /** Keep zero-count buckets in the output instead of filtering them out. */
  keepZero?: boolean;
  /** Applied to each parsed value before counting (e.g. lowercase+trim for word_cloud). Falsy results are skipped. */
  normalize?: (value: string) => string;
};

/**
 * Tallies raw vote rows into counts and sorted-by-insertion buckets. The one
 * aggregation implementation — DisplayScreen, the session page's server-side
 * CSV/export data, and the presenter screen each used to reimplement this
 * (including the multi-answer JSON-array parse) independently.
 */
export function aggregate(votes: { value: string }[], spec: AggregateSpec = {}): Aggregate {
  const counts: Record<string, number> = {};
  spec.seedKeys?.forEach((k) => { counts[k] = 0; });

  votes.forEach(({ value }) => {
    parseVoteValue(value).forEach((raw) => {
      const v = spec.normalize ? spec.normalize(raw) : raw;
      if (!v) return;
      counts[v] = (counts[v] ?? 0) + 1;
    });
  });

  const buckets = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .filter((e) => e.count > 0 || spec.keepZero);

  return { total: votes.length, counts, buckets };
}
