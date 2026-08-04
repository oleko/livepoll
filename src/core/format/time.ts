/**
 * Formats a non-negative second count as `M:SS` once it reaches a minute,
 * or as a bare number of seconds below that. Callers append their own
 * suffix ("с", " сек", or nothing) — the five call sites that used to
 * hand-roll this each wanted a different suffix, so only the shared
 * arithmetic is centralized here.
 */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = String(s % 60).padStart(2, "0");
    return `${m}:${rem}`;
  }
  return String(s);
}
