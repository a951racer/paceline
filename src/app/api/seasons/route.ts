/**
 * GET /api/seasons - List all seasons (public)
 *
 * Public endpoint - no authentication required.
 * Returns all seasons ordered by startDate descending for the season selector.
 *
 * @see Design doc: Public Endpoints table
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { connectMongoDB } from "@/lib/db/mongodb";
import { SeasonModel } from "@/models/season.model";

const handleGet = async (): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    const seasons = await SeasonModel.find({})
      .select("name startDate endDate isActive")
      .sort({ startDate: -1 });

    return NextResponse.json({ data: seasons }, { status: 200 });
  } catch (error) {
    console.error("[Seasons GET] Error:", error);
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
