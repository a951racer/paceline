/**
 * Security headers middleware using Helmet.
 *
 * Since Next.js App Router API routes don't use Express-style middleware directly,
 * this module provides a wrapper function that applies Helmet-derived security headers
 * to Next.js Response objects.
 *
 * @see Requirements 12.8
 */

import { NextResponse } from "next/server";

/**
 * Default security headers based on Helmet's defaults.
 * These headers protect against common web vulnerabilities.
 */
const SECURITY_HEADERS: Record<string, string> = {
  // Prevents MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  // Controls DNS prefetching
  "X-DNS-Prefetch-Control": "off",
  // Prevents clickjacking via iframes
  "X-Frame-Options": "SAMEORIGIN",
  // Enables browser XSS filter (legacy, but still useful for older browsers)
  "X-XSS-Protection": "0",
  // Controls referrer information sent with requests
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Removes the X-Powered-By header (handled via Next.js config, but belt-and-suspenders)
  "X-Powered-By": "",
  // Strict Transport Security - enforce HTTPS
  "Strict-Transport-Security": "max-age=15552000; includeSubDomains",
  // Permissions Policy - restrict browser features
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  // Cross-Origin-Opener-Policy
  "Cross-Origin-Opener-Policy": "same-origin",
};

/**
 * Applies security headers to a NextResponse object.
 * Use this in API route handlers to add Helmet-equivalent security headers.
 *
 * @example
 * ```ts
 * import { applySecurityHeaders } from '@/middleware/security-headers';
 *
 * export async function GET() {
 *   const response = NextResponse.json({ data: "value" });
 *   return applySecurityHeaders(response);
 * }
 * ```
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    if (header === "X-Powered-By") {
      response.headers.delete(header);
    } else {
      response.headers.set(header, value);
    }
  }
  return response;
}

/**
 * Higher-order function that wraps an API route handler to apply security headers.
 *
 * @example
 * ```ts
 * import { withSecurityHeaders } from '@/middleware/security-headers';
 *
 * export const GET = withSecurityHeaders(async (request) => {
 *   return NextResponse.json({ message: "hello" });
 * });
 * ```
 */
export function withSecurityHeaders(
  handler: (request: Request) => Promise<NextResponse> | NextResponse
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    const response = await handler(request);
    return applySecurityHeaders(response);
  };
}

/**
 * Returns the security headers as a plain object.
 * Useful for applying headers in Next.js middleware (src/middleware.ts).
 */
export function getSecurityHeaders(): Record<string, string> {
  return { ...SECURITY_HEADERS };
}
