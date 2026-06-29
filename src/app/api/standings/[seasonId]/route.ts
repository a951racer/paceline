/**
 * GET /api/standings/[seasonId] - Historical standings for a specific season
 *
 * Public endpoint - no authentication required.
 * Returns individual standings for the given season, sorted by position
 * and grouped by competitionId.
 *
 * @see Requirements 6.3, 6.19
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { connectMongoDB } from "@/lib/db/mongodb";
import { StandingModel } from "@/models/standing.model";
import { SeasonService } from "@/services/season.service";

const seasonService = new SeasonService();

const handleGet = async (request: Request): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    // Extract seasonId from URL path
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const seasonId = segments[segments.length - 1];
    const leagueId = url.searchParams.get("leagueId");

    if (!leagueId) {
      return NextResponse.json(
        {
          status: 400,
          code: "LEAGUE_REQUIRED",
          message: "leagueId query parameter is required",
        },
        { status: 400 }
      );
    }

    // Validate that the season exists
    const season = await seasonService.getById(seasonId);
    if (!season) {
      return NextResponse.json(
        {
          status: 404,
          code: "SEASON_NOT_FOUND",
          message: `Season with id "${seasonId}" not found`,
        },
        { status: 404 }
      );
    }

    const standings = await StandingModel.find({
      seasonId: season._id,
      leagueId,
    }).sort({ competitionId: 1, position: 1 });

    // Group standings by competitionId
    const grouped: Record<string, typeof standings> = {};
    for (const standing of standings) {
      const compId = standing.competitionId.toString();
      if (!grouped[compId]) {
        grouped[compId] = [];
      }
      grouped[compId].push(standing);
    }

    return NextResponse.json(
      {
        data: grouped,
        seasonId: season._id.toString(),
        seasonName: season.name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Standings by Season GET] Error:", error);

    // Handle invalid ObjectId format
    if (
      error instanceof Error &&
      (error.message.includes("Cast to ObjectId failed") ||
        error.name === "CastError")
    ) {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_SEASON_ID",
          message: "Invalid season ID format",
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

export const GET = withRateLimit({ type: "public" })(handleGet);
