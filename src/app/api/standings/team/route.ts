/**
 * GET /api/standings/team - Team standings for active season
 *
 * Public endpoint - no authentication required.
 * Returns team standings for the active season, sorted by position.
 *
 * @see Requirements 6.8, 6.18
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { connectMongoDB } from "@/lib/db/mongodb";
import { TeamStandingModel } from "@/models/standing.model";
import { SeasonService } from "@/services/season.service";

const seasonService = new SeasonService();

const handleGet = async (): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    const activeSeason = await seasonService.getActive();

    if (!activeSeason) {
      return NextResponse.json(
        {
          data: [],
          message: "No active season found",
        },
        { status: 200 }
      );
    }

    const teamStandings = await TeamStandingModel.find({
      seasonId: activeSeason._id,
    }).sort({ competitionId: 1, position: 1 });

    // Group team standings by competitionId
    const grouped: Record<string, typeof teamStandings> = {};
    for (const standing of teamStandings) {
      const compId = standing.competitionId.toString();
      if (!grouped[compId]) {
        grouped[compId] = [];
      }
      grouped[compId].push(standing);
    }

    return NextResponse.json(
      {
        data: grouped,
        seasonId: activeSeason._id.toString(),
        seasonName: activeSeason.name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Team Standings GET] Error:", error);
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
