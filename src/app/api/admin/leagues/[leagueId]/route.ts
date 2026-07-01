/**
 * PUT /api/admin/leagues/[leagueId] - Update league name/description (Super_Admin only)
 * @see Requirements 1.2, 12.7
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { LeagueService } from "@/services/league.service";
import { LeagueAuthorizationService } from "@/services/league-authorization.service";
import { updateLeagueSchema } from "@/lib/validations/league";

const leagueService = new LeagueService();
const leagueAuthService = new LeagueAuthorizationService();

function extractLeagueId(url: string): string {
  // URL: /api/admin/leagues/[leagueId]
  const parts = url.split("/");
  return parts[parts.length - 1];
}

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const leagueId = extractLeagueId(url.pathname);

    const league = await leagueService.getById(leagueId);
    if (!league) {
      return NextResponse.json(
        { status: 404, code: "LEAGUE_NOT_FOUND", message: `League with id "${leagueId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: league }, { status: 200 });
  } catch (error) {
    console.error("[Admin Leagues GET/:id] Error:", error);
    return NextResponse.json(
      { status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
};

const handlePut: AuthenticatedHandler = async (request, context) => {
  try {
    // Super_Admin only
    const isSuperAdmin = await leagueAuthService.isSuperAdmin(context.userId);
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          status: 403,
          code: "SUPER_ADMIN_REQUIRED",
          message: "Only Super Administrators can update leagues",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const leagueId = extractLeagueId(url.pathname);

    const body = await request.json();
    const parsed = updateLeagueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const league = await leagueService.update(leagueId, parsed.data);
    return NextResponse.json({ data: league }, { status: 200 });
  } catch (error) {
    console.error("[Admin Leagues PUT] Error:", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code: string }).code === "LEAGUE_NOT_FOUND"
    ) {
      return NextResponse.json(
        { status: 404, code: "LEAGUE_NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code: string }).code === "LEAGUE_DUPLICATE_NAME"
    ) {
      return NextResponse.json(
        {
          status: 409,
          code: "LEAGUE_DUPLICATE_NAME",
          message: error.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        status: 500,
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
};

export const GET = withRateLimit({ type: "admin" })(withAdmin(handleGet));
export const PUT = withRateLimit({ type: "admin" })(withAdmin(handlePut));
