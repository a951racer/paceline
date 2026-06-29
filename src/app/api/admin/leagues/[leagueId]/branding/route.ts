/**
 * PUT /api/admin/leagues/[leagueId]/branding - Update league branding (League_Admin+)
 * @see Requirements 11.2
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  withLeagueAuth,
  type LeagueAuthorizedHandler,
} from "@/middleware/league-auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { BrandingService } from "@/services/branding.service";

const hexColorRegex = /^#([0-9A-Fa-f]{6})$/;

const updateBrandingSchema = z.object({
  leagueName: z.string().min(1, "League name is required"),
  logos: z.object({
    square: z.string().min(1, "Square logo URL is required"),
    horizontal: z.string().min(1, "Horizontal logo URL is required"),
    vertical: z.string().min(1, "Vertical logo URL is required"),
  }),
  mainColors: z.tuple([
    z.string().regex(hexColorRegex, "Must be a valid hex color (#RRGGBB)"),
    z.string().regex(hexColorRegex, "Must be a valid hex color (#RRGGBB)"),
    z.string().regex(hexColorRegex, "Must be a valid hex color (#RRGGBB)"),
  ]),
  accentColors: z
    .array(z.string().regex(hexColorRegex, "Must be a valid hex color (#RRGGBB)"))
    .min(1, "At least 1 accent color is required")
    .max(2, "At most 2 accent colors are allowed"),
});

const brandingService = new BrandingService();

function extractLeagueId(url: string): string {
  // URL: /api/admin/leagues/[leagueId]/branding
  const parts = url.split("/");
  const brandingIndex = parts.indexOf("branding");
  return parts[brandingIndex - 1];
}

const handlePut: LeagueAuthorizedHandler = async (request, context) => {
  try {
    const url = new URL(request.url);
    const leagueId = extractLeagueId(url.pathname);

    // Ensure the leagueId from URL matches the leagueId from auth context
    if (leagueId !== context.leagueId) {
      return NextResponse.json(
        {
          status: 403,
          code: "LEAGUE_ACCESS_DENIED",
          message: "League ID in URL does not match authorized league context",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateBrandingSchema.safeParse(body);

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

    const branding = await brandingService.update(leagueId, {
      ...parsed.data,
      updatedBy: context.userId,
    });

    return NextResponse.json({ data: branding }, { status: 200 });
  } catch (error) {
    console.error("[Admin League Branding PUT] Error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          status: 404,
          code: "LEAGUE_NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.includes("color")) {
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

export const PUT = withRateLimit({ type: "admin" })(withLeagueAuth(handlePut));
