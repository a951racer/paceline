/**
 * POST /api/admin/seasons/[seasonId]/activate - Activate a season
 * Ensures only one season is active at any given time.
 * @see Requirements 18.2
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { SeasonService } from "@/services/season.service";

const seasonService = new SeasonService();

const handlePost: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    // URL pattern: /api/admin/seasons/[seasonId]/activate
    const segments = url.pathname.split("/");
    const seasonId = segments[segments.length - 2];

    const season = await seasonService.activate(seasonId);

    return NextResponse.json({ data: season }, { status: 200 });
  } catch (error) {
    console.error("[Admin Seasons POST activate] Error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: error.message,
        },
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

export const POST = withRateLimit({ type: "admin" })(withAdmin(handlePost));
