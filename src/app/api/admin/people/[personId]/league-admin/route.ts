/**
 * POST /api/admin/people/[personId]/league-admin - Assign League_Admin role (Super_Admin only)
 * DELETE /api/admin/people/[personId]/league-admin - Remove League_Admin role (Super_Admin only)
 * @see Requirements 12.3, 12.4, 12.8
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { LeagueAuthorizationService } from "@/services/league-authorization.service";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const assignLeagueAdminSchema = z.object({
  leagueIds: z
    .array(z.string().regex(objectIdRegex, "Each leagueId must be a valid ObjectId"))
    .min(1, "At least one leagueId is required"),
});

const leagueAuthService = new LeagueAuthorizationService();

function extractPersonId(url: string): string {
  // URL: /api/admin/people/[personId]/league-admin
  const parts = url.split("/");
  const leagueAdminIndex = parts.indexOf("league-admin");
  return parts[leagueAdminIndex - 1];
}

const handlePost: AuthenticatedHandler = async (request, context) => {
  try {
    // Super_Admin only
    const isSuperAdmin = await leagueAuthService.isSuperAdmin(context.userId);
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          status: 403,
          code: "SUPER_ADMIN_REQUIRED",
          message: "Only Super Administrators can assign League Admin roles",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const personId = extractPersonId(url.pathname);

    const body = await request.json();
    const parsed = assignLeagueAdminSchema.safeParse(body);

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

    await leagueAuthService.assignLeagueAdmin(personId, parsed.data.leagueIds);

    return NextResponse.json(
      { message: "League Admin role assigned successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin People League-Admin POST] Error:", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code: string }).code === "PERSON_NOT_FOUND"
    ) {
      return NextResponse.json(
        { status: 404, code: "PERSON_NOT_FOUND", message: error.message },
        { status: 404 }
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

const handleDelete: AuthenticatedHandler = async (request, context) => {
  try {
    // Super_Admin only
    const isSuperAdmin = await leagueAuthService.isSuperAdmin(context.userId);
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          status: 403,
          code: "SUPER_ADMIN_REQUIRED",
          message: "Only Super Administrators can remove League Admin roles",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const personId = extractPersonId(url.pathname);

    await leagueAuthService.removeLeagueAdmin(personId);

    return NextResponse.json(
      { message: "League Admin role removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin People League-Admin DELETE] Error:", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code: string }).code === "PERSON_NOT_FOUND"
    ) {
      return NextResponse.json(
        { status: 404, code: "PERSON_NOT_FOUND", message: error.message },
        { status: 404 }
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

export const POST = withRateLimit({ type: "admin" })(withAdmin(handlePost));
export const DELETE = withRateLimit({ type: "admin" })(withAdmin(handleDelete));
