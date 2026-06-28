/**
 * Next.js global middleware.
 *
 * Applies Helmet-equivalent security headers to all responses.
 * This runs at the edge for every request matched by the config matcher.
 *
 * @see Requirements 12.8
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityHeaders } from "./middleware/security-headers";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const securityHeaders = getSecurityHeaders();

  for (const [header, value] of Object.entries(securityHeaders)) {
    if (header === "X-Powered-By") {
      response.headers.delete(header);
    } else {
      response.headers.set(header, value);
    }
  }

  return response;
}

/**
 * Matcher configuration.
 * Apply security headers to all routes except static assets and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser favicon)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
