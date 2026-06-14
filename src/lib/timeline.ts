export function bucketTimestamps(timestamps: string[], n: number): number[] {
  const buckets = Array(n).fill(0);
  if (timestamps.length < 2) return buckets;
  const times = timestamps.map(t => new Date(t).getTime()).sort((a, b) => a - b);
  const start = times[0];
  const end = times[times.length - 1];
  const duration = end - start;
  if (duration < 1000) return buckets;
  const bucketMs = duration / n;
  times.forEach(t => {
    buckets[Math.min(Math.floor((t - start) / bucketMs), n - 1)]++;
  });
  return buckets;
}