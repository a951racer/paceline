/**
 * GET /api/branding - Current branding configuration
 *
 * Public endpoint - no authentication required.
 * Returns the branding config for the specified league (via leagueId query param)
 * or falls back to the default league's branding.
 *
 * @see Requirements 11.3, 11.4, 19.1, 19.5
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { BrandingService } from "@/services/branding.service";
import { LeagueModel } from "@/models/league.model";
import { connectMongoDB } from "@/lib/db/mongodb";

const brandingService = new BrandingService();

const handleGet = async (request: Request): Promise<NextResponse> => {
  try {
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");

    if (leagueId) {
      // Return branding for the specific league
      const branding = await brandingService.get(leagueId);
      if (!branding) {
        return NextResponse.json(
          {
            status: 404,
            code: "LEAGUE_NOT_FOUND",
            message: "League not found or has no branding configured",
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: branding }, { status: 200 });
    }

    // No leagueId specified - try to get the first active league's branding (default)
    await connectMongoDB();
    const defaultLeague = await LeagueModel.findOne({ isActive: true }).select("branding");

    if (defaultLeague && defaultLeague.branding) {
      return NextResponse.json({ data: defaultLeague.branding }, { status: 200 });
    }

    // Fall back to legacy standalone collection or return defaults
    const legacyBranding = await brandingService.getLegacy();
    if (legacyBranding) {
      return NextResponse.json({ data: legacyBranding }, { status: 200 });
    }

    // Return a default branding config when none has been configured
    return NextResponse.json(
      {
        data: {
          leagueName: "Bike Racing League",
          logos: {
            square: "",
            horizontal: "",
            vertical: "",
          },
          mainColors: ["#000000", "#FFFFFF", "#333333"],
          accentColors: ["#FF5733"],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Branding GET] Error:", error);
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
