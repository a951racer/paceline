/**
 * GET /api/leagues/[leagueId]/branding - Get branding for a specific league (public)
 * @see Requirements 11.4
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { BrandingService } from "@/services/branding.service";

const brandingService = new BrandingService();

function extractLeagueId(url: string): string {
  // URL: /api/leagues/[leagueId]/branding
  const parts = url.split("/");
  const brandingIndex = parts.indexOf("branding");
  return parts[brandingIndex - 1];
}

async function handleGet(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const leagueId = extractLeagueId(url.pathname);

    const branding = await brandingService.get(leagueId);

    if (!branding) {
      return NextResponse.json(
        {
          status: 404,
          code: "LEAGUE_NOT_FOUND",
          message: `Branding not found for league "${leagueId}"`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: branding }, { status: 200 });
  } catch (error) {
    console.error("[Public League Branding GET] Error:", error);
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
