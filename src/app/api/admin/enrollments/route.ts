/**
 * GET /api/admin/enrollments - List enrollments for active league-season (League_Admin+)
 * @see Requirements 3.7, 4.7
 */

import { NextResponse } from "next/server";
import {
  withLeagueAuth,
  type LeagueAuthorizedHandler,
} from "@/middleware/league-auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { EnrollmentService } from "@/services/enrollment.service";
import type { EnrollmentEntityType } from "@/models/enrollment.model";

const enrollmentService = new EnrollmentService();

const handleGet: LeagueAuthorizedHandler = async (request, context) => {
  try {
    const url = new URL(request.url);
    const seasonId = url.searchParams.get("seasonId");
    const type = url.searchParams.get("type") as EnrollmentEntityType | null;

    if (!seasonId) {
      return NextResponse.json(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: "seasonId query parameter is required",
        },
        { status: 400 }
      );
    }

    const enrollments = await enrollmentService.listByLeagueSeason(
      context.leagueId,
      seasonId,
      type || undefined
    );

    return NextResponse.json({ data: enrollments }, { status: 200 });
  } catch (error) {
    console.error("[Admin Enrollments GET] Error:", error);
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

export const GET = withRateLimit({ type: "admin" })(withLeagueAuth(handleGet));
