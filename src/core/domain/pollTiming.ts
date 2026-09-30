/**
 * When a timed poll is due to end, derived from what is already stored:
 * `settings.duration` (seconds, set by the host) and `settings.activated_at`
 * (written by activateTargetPoll). No extra column needed.
 *
 * This existed only as an inline calculation inside the projector's countdown
 * effect, which is also the single place that closed the poll. That made
 * closing conditional on a browser being open and awake in the room: with the
 * projector closed, a timed poll stayed "active" forever and kept accepting
 * votes long after the host had moved on.
 */
export type PollTimingSettings = { duration?: number; activated_at?: string } | null | undefined;

export function pollDeadline(settings: PollTimingSettings): number | null {
  const duration = settings?.duration;
  const activatedAt = settings?.activated_at;
  if (!duration || duration <= 0 || !activatedAt) return null;

  const startedMs = new Date(activatedAt).getTime();
  if (Number.isNaN(startedMs)) return null;

  return startedMs + duration * 1000;
}

export function isPollExpired(settings: PollTimingSettings, now: number = Date.now()): boolean {
  const deadline = pollDeadline(settings);
  return deadline !== null && now >= deadline;
}

/** Whole seconds left, or null when the poll is not timed. Never negative. */
export function pollSecondsLeft(settings: PollTimingSettings, now: number = Date.now()): number | null {
  const deadline = pollDeadline(settings);
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
