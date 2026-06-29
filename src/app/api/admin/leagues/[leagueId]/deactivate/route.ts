/**
 * PATCH /api/admin/leagues/[leagueId]/deactivate - Deactivate a league (Super_Admin only)
 * @see Requirements 1.5, 12.7
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { LeagueService } from "@/services/league.service";
import { LeagueAuthorizationService } from "@/services/league-authorization.service";

const leagueService = new LeagueService();
const leagueAuthService = new LeagueAuthorizationService();

function extractLeagueId(url: string): string {
  // URL: /api/admin/leagues/[leagueId]/deactivate
  const parts = url.split("/");
  const deactivateIndex = parts.indexOf("deactivate");
  return parts[deactivateIndex - 1];
}

const handlePatch: AuthenticatedHandler = async (request, context) => {
  try {
    // Super_Admin only
    const isSuperAdmin = await leagueAuthService.isSuperAdmin(context.userId);
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          status: 403,
          code: "SUPER_ADMIN_REQUIRED",
          message: "Only Super Administrators can deactivate leagues",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const leagueId = extractLeagueId(url.pathname);

    const league = await leagueService.deactivate(leagueId);
    return NextResponse.json({ data: league }, { status: 200 });
  } catch (error) {
    console.error("[Admin Leagues Deactivate PATCH] Error:", error);

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

export const PATCH = withRateLimit({ type: "admin" })(withAdmin(handlePatch));
