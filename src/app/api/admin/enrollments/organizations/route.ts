/**
 * POST /api/admin/enrollments/organizations - Enroll an organization in league-season (League_Admin+)
 * @see Requirements 4.1
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  withLeagueAuth,
  type LeagueAuthorizedHandler,
} from "@/middleware/league-auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { EnrollmentService } from "@/services/enrollment.service";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const enrollOrgSchema = z.object({
  organizationId: z.string().regex(objectIdRegex, "organizationId must be a valid ObjectId"),
  seasonId: z.string().regex(objectIdRegex, "seasonId must be a valid ObjectId"),
});

const enrollmentService = new EnrollmentService();

const handlePost: LeagueAuthorizedHandler = async (request, context) => {
  try {
    const body = await request.json();
    const parsed = enrollOrgSchema.safeParse(body);

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

    const enrollment = await enrollmentService.enrollOrganization(
      parsed.data.organizationId,
      context.leagueId,
      parsed.data.seasonId,
      context.userId
    );

    return NextResponse.json({ data: enrollment }, { status: 201 });
  } catch (error) {
    console.error("[Admin Enrollments Organizations POST] Error:", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code: string }).code === "ENROLLMENT_DUPLICATE"
    ) {
      return NextResponse.json(
        {
          status: 409,
          code: "ENROLLMENT_DUPLICATE",
          message: error.message,
        },
        { status: 409 }
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

export const POST = withRateLimit({ type: "admin" })(withLeagueAuth(handlePost));
