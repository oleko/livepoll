import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JOIN_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/i;

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.slice(1);
  // Short join-code redirect: e.g. /ABC123 → /join/ABC123
  if (JOIN_CODE_RE.test(segment)) {
    return NextResponse.redirect(new URL(`/join/${segment.toUpperCase()}`, request.url));
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
