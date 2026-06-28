/**
 * GET /api/admin/seasons - List all seasons
 * POST /api/admin/seasons - Create a new season
 * @see Requirements 18.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { SeasonService } from "@/services/season.service";
import { createSeasonSchema } from "@/lib/validations";

const seasonService = new SeasonService();

const handleGet: AuthenticatedHandler = async () => {
  try {
    const seasons = await seasonService.list();

    return NextResponse.json({ data: seasons }, { status: 200 });
  } catch (error) {
    console.error("[Admin Seasons GET] Error:", error);
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

const handlePost: AuthenticatedHandler = async (request) => {
  try {
    const body = await request.json();
    const parsed = createSeasonSchema.safeParse(body);

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

    const season = await seasonService.create(parsed.data);

    return NextResponse.json({ data: season }, { status: 201 });
  } catch (error) {
    console.error("[Admin Seasons POST] Error:", error);

    if (error instanceof Error && error.message.includes("overlaps")) {
      return NextResponse.json(
        {
          status: 409,
          code: "SEASON_OVERLAP",
          message: error.message,
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message.includes("End date")) {
      return NextResponse.json(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: error.message,
        },
        { status: 400 }
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
