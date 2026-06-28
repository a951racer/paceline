/**
 * PUT /api/admin/branding - Update branding configuration
 *
 * Admin-only endpoint - requires valid JWT with 'administrator' role.
 * Validates input with Zod schema and updates the branding configuration.
 *
 * @see Requirements 19.1, 19.5
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { BrandingService } from "@/services/branding.service";
import { updateBrandingSchema } from "@/lib/validations/branding";

const brandingService = new BrandingService();

const handlePut: AuthenticatedHandler = async (request, { userId }) => {
  try {
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

    const branding = await brandingService.update({
      leagueName: parsed.data.leagueName,
      logos: parsed.data.logos,
      mainColors: parsed.data.mainColors,
      accentColors: parsed.data.accentColors,
      updatedBy: userId,
    });

    return NextResponse.json({ data: branding }, { status: 200 });
  } catch (error) {
    console.error("[Admin Branding PUT] Error:", error);

    // Surface domain validation errors as 400
    if (error instanceof Error && error.message) {
      const isDomainError =
        error.message.includes("colors") ||
        error.message.includes("logo") ||
        error.message.includes("League name");

      if (isDomainError) {
        return NextResponse.json(
          {
            status: 400,
            code: "VALIDATION_ERROR",
            message: error.message,
          },
          { status: 400 }
        );
      }
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

export const PUT = withRateLimit({ type: "admin" })(withAdmin(handlePut));
