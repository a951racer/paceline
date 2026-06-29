/**
 * GET /api/admin/leagues - List all leagues (Super_Admin only)
 * POST /api/admin/leagues - Create a new league (Super_Admin only)
 * @see Requirements 1.1, 1.2, 12.7
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { LeagueService } from "@/services/league.service";
import { LeagueAuthorizationService } from "@/services/league-authorization.service";
import { createLeagueSchema } from "@/lib/validations/league";

const leagueService = new LeagueService();
const leagueAuthService = new LeagueAuthorizationService();

const handleGet: AuthenticatedHandler = async (_request, context) => {
  try {
    // Super_Admin only
    const isSuperAdmin = await leagueAuthService.isSuperAdmin(context.userId);
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          status: 403,
          code: "SUPER_ADMIN_REQUIRED",
          message: "Only Super Administrators can manage leagues",
        },
        { status: 403 }
      );
    }

    const leagues = await leagueService.listAll();
    return NextResponse.json({ data: leagues }, { status: 200 });
  } catch (error) {
    console.error("[Admin Leagues GET] Error:", error);
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

const handlePost: AuthenticatedHandler = async (request, context) => {
  try {
    // Super_Admin only
    const isSuperAdmin = await leagueAuthService.isSuperAdmin(context.userId);
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          status: 403,
          code: "SUPER_ADMIN_REQUIRED",
          message: "Only Super Administrators can create leagues",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createLeagueSchema.safeParse(body);

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

    const league = await leagueService.create(parsed.data);
    return NextResponse.json({ data: league }, { status: 201 });
  } catch (error) {
    console.error("[Admin Leagues POST] Error:", error);

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
export const POST = withRateLimit({ type: "admin" })(withAdmin(handlePost));
