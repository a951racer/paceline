/**
 * GET /api/leagues - List active leagues (public, for standings page league selector)
 * @see Requirements 7.2, 11.4
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { LeagueService } from "@/services/league.service";

const leagueService = new LeagueService();

async function handleGet(): Promise<NextResponse> {
  try {
    const leagues = await leagueService.listActive();
    return NextResponse.json({ data: leagues }, { status: 200 });
  } catch (error) {
    console.error("[Public Leagues GET] Error:", error);
    return NextResponse.json(
      {
        status: 500,
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit({ type: "public" })(handleGet);
