/**
 * GET /api/branding - Current branding configuration
 *
 * Public endpoint - no authentication required.
 * Returns the current league branding config (name, logos, colors)
 * or a default if none has been configured yet.
 *
 * @see Requirements 19.1, 19.5
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { BrandingService } from "@/services/branding.service";

const brandingService = new BrandingService();

const handleGet = async (): Promise<NextResponse> => {
  try {
    const branding = await brandingService.get();

    if (!branding) {
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
    }

    return NextResponse.json({ data: branding }, { status: 200 });
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
