import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * Per-participant limits, keyed by voter token rather than by IP.
 *
 * The original key was the client IP alone. In a conference hall everyone is
 * behind one NAT, so a room of 200 people shared a single budget of 30 votes
 * per minute: the limiter would start refusing legitimate votes within seconds
 * of a poll opening, and the host would see a room that "can't vote". Keying on
 * the voter token gives each phone its own budget; a much looser IP ceiling
 * stays behind it to catch a script cycling through fresh tokens.
 */
export async function clientIp(): Promise<string> {
  return ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

export type RateVerdict = { ok: true } | { ok: false; error: string };

const TOO_MANY = "Слишком много запросов. Подождите немного.";

export async function limitPerVoter(
  action: string,
  voterToken: string,
  perVoterPerMinute: number,
  perIpPerMinute: number
): Promise<RateVerdict> {
  if (!checkRateLimit(`${action}:token:${voterToken}`, perVoterPerMinute, 60_000)) {
    return { ok: false, error: TOO_MANY };
  }
  const ip = await clientIp();
  if (!checkRateLimit(`${action}:ip:${ip}`, perIpPerMinute, 60_000)) {
    return { ok: false, error: TOO_MANY };
  }
  return { ok: true };
}

/** For authenticated actions: the account is the natural budget holder. */
export function limitPerUser(action: string, userId: string, perMinute: number): RateVerdict {
  if (!checkRateLimit(`${action}:user:${userId}`, perMinute, 60_000)) {
    return { ok: false, error: TOO_MANY };
  }
  return { ok: true };
}
