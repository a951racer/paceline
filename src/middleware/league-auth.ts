/**
 * League Authorization Middleware for Next.js API routes.
 *
 * Provides a higher-order function that wraps admin API route handlers to enforce
 * league-scoped access control. Extracts leagueId from query params or X-League-Id
 * header, then validates the user's adminScope to determine access.
 *
 * - Super_Admin: allowed access to any league
 * - League_Admin: allowed only if leagueId is in their assigned leagues
 * - Others: denied admin operations
 *
 * @see Requirements 12.5, 12.6, 12.7, 12.9
 */

import { NextResponse } from "next/server";
import {
  verifyToken,
  extractBearerToken,
  type DecodedToken,
} from "@/lib/auth/jwt";

/** League authorization context passed to downstream route handlers */
export interface LeagueAuthContext {
  leagueId: string;
  isSuperAdmin: boolean;
  isLeagueAdmin: boolean;
  adminLeagueIds: string[];
  userId: string;
  email: string;
  roles: string[];
}

/** Handler signature for league-authorized admin routes */
export type LeagueAuthorizedHandler = (
  request: Request,
  context: LeagueAuthContext
) => Promise<NextResponse> | NextResponse;

/**
 * Extracts leagueId from the request.
 * Priority: query param `leagueId` first, then `X-League-Id` header.
 */
function extractLeagueId(request: Request): string | null {
  const url = new URL(request.url);
  const queryLeagueId = url.searchParams.get("leagueId");
  if (queryLeagueId) {
    return queryLeagueId;
  }

  const headerLeagueId = request.headers.get("X-League-Id");
  return headerLeagueId || null;
}

/**
 * Creates a 400 Bad Request JSON response for missing leagueId.
 */
function createLeagueRequiredResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({
      status: 400,
      code: "LEAGUE_REQUIRED",
      message: "leagueId parameter is missing from request",
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
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
 * Creates a 403 Forbidden JSON response for league access denial.
 */
function createLeagueAccessDeniedResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({
      status: 403,
      code: "LEAGUE_ACCESS_DENIED",
      message: "You do not have access to this league",
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Higher-order function that wraps an admin API route handler with league authorization.
 *
 * Validates:
 * 1. A valid JWT token is present (401 if not)
 * 2. A leagueId is provided via query param or X-League-Id header (400 if missing)
 * 3. The user has admin access to the specified league (403 if denied)
 *
 * Access rules:
 * - Super_Admin (adminScope.type === 'super'): allowed for any league
 * - League_Admin (adminScope.type === 'league'): allowed only if leagueId is in adminScope.leagueIds
 * - No adminScope: denied with 403
 *
 * @example
 * ```ts
 * import { withLeagueAuth } from '@/middleware/league-auth';
 *
 * export const GET = withLeagueAuth(async (request, ctx) => {
 *   // ctx.leagueId, ctx.isSuperAdmin, ctx.isLeagueAdmin available
 *   return NextResponse.json({ leagueId: ctx.leagueId });
 * });
 * ```
 */
export function withLeagueAuth(
  handler: LeagueAuthorizedHandler
): (request: Request) => Promise<NextResponse> {
  return async (request: Request): Promise<NextResponse> => {
    // Step 1: Verify authentication
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return createUnauthorizedResponse();
    }

    let decoded: DecodedToken;
    try {
      decoded = verifyToken(token);
    } catch {
      return createUnauthorizedResponse();
    }

    // Step 2: Extract leagueId
    const leagueId = extractLeagueId(request);
    if (!leagueId) {
      return createLeagueRequiredResponse();
    }

    // Step 3: Check admin access based on adminScope
    const adminScope = decoded.adminScope;

    if (!adminScope) {
      return createLeagueAccessDeniedResponse();
    }

    const isSuperAdmin = adminScope.type === "super";
    const adminLeagueIds = adminScope.leagueIds ?? [];
    const isLeagueAdmin =
      adminScope.type === "league" && adminLeagueIds.includes(leagueId);

    if (!isSuperAdmin && !isLeagueAdmin) {
      return createLeagueAccessDeniedResponse();
    }

    // Step 4: Build context and pass to handler
    const context: LeagueAuthContext = {
      leagueId,
      isSuperAdmin,
      isLeagueAdmin,
      adminLeagueIds,
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
    };

    return handler(request, context);
  };
}
