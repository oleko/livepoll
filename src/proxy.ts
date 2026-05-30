import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Join codes are exactly 6 chars from the join code charset (no I, O, 0, 1)
const JOIN_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/i;

export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.slice(1); // strip leading /
  if (JOIN_CODE_RE.test(segment)) {
    return NextResponse.redirect(
      new URL(`/join/${segment.toUpperCase()}`, request.url)
    );
  }
  return NextResponse.next();
}

export const config = {
  // Skip known route prefixes and Next.js internals
  matcher: [
    "/((?!_next|api|auth|admin|org|join|display|help|docs|onboarding|favicon).*)",
  ],
};
