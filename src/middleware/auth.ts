/**
 * Authentication and authorization middleware for Next.js API routes.
 *
 * Provides higher-order functions (HOFs) that wrap API route handlers to enforce
 * authentication and role-based access control using JWT tokens.
 *
 * - `withAuth`: Requires a valid JWT token (returns 401 if missing/invalid)
 * - `withAdmin`: Requires a valid JWT token with 'administrator' role (returns 401/403)
 *
 * @see Requirements 12.5, 12.6, 12.7
 */

import { NextResponse } from "next/server";
import {
  verifyToken,
  extractBearerToken,
  AuthError,
  type DecodedToken,
} from "@/lib/auth/jwt";

/** Decoded user context passed to authenticated route handlers */
export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
}

/** Handler signature for authenticated routes */
export type AuthenticatedHandler = (
  request: Request,
  context: AuthContext
) => Promise<NextResponse> | NextResponse;

/**
 * Extracts and verifies the JWT token from the request's Authorization header.
 * Returns the decoded token on success, or null on failure.
 */
function extractAuthContext(request: Request): DecodedToken | null {
  const authHeader = request.headers.get("authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Creates a 401 Unauthorized JSON response.
 */
function createUnauthorizedResponse(message = "Authentication required"): NextResponse {
  return new NextResponse(
    JSON.stringify({
      status: 401,
      code: "UNAUTHORIZED",
      message,
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Creates a 403 Forbidden JSON response.
 */
function createForbiddenResponse(message = "Insufficient permissions"): NextResponse {
  return new NextResponse(
    JSON.stringify({
      status: 403,
      code: "FORBIDDEN",
      message,
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Higher-order function that wraps an API route handler with authentication.
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and passes the decoded user context to the handler.
 *
 * Returns 401 if no valid token is present.
 *
 * @example
 * ```ts
 * import { withAuth } from '@/middleware/auth';
 *
 * export const GET = withAuth(async (request, { userId, email, roles }) => {
 *   return NextResponse.json({ userId, email });
 * });
 * ```
 */
export function withAuth(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return async (request: Request): Promise<NextResponse> => {
    const decoded = extractAuthContext(request);

    if (!decoded) {
      return createUnauthorizedResponse();
    }

    const context: AuthContext = {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
    };

    return handler(request, context);
  };
}

/**
 * Higher-order function that wraps an API route handler with admin authorization.
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and checks that the user has the 'administrator' role.
 *
 * Returns 401 if no valid token is present.
 * Returns 403 if the user doesn't have the 'administrator' role.
 *
 * @example
 * ```ts
 * import { withAdmin } from '@/middleware/auth';
 *
 * export const POST = withAdmin(async (request, { userId, email, roles }) => {
 *   // Only administrators reach here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withAdmin(
  handler: AuthenticatedHandler
): (request: Request) => Promise<NextResponse> {
  return async (request: Request): Promise<NextResponse> => {
    const decoded = extractAuthContext(request);

    if (!decoded) {
      return createUnauthorizedResponse();
    }

    if (!decoded.roles.includes("administrator")) {
      return createForbiddenResponse();
    }

    const context: AuthContext = {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
    };

    return handler(request, context);
  };
}
