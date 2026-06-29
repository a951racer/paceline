/**
 * DELETE /api/admin/enrollments/persons/[personId] - Remove person enrollment (League_Admin+)
 * @see Requirements 3.4
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

const removeEnrollmentSchema = z.object({
  seasonId: z.string().regex(objectIdRegex, "seasonId must be a valid ObjectId"),
});

const enrollmentService = new EnrollmentService();

function extractPersonId(url: string): string {
  // URL: /api/admin/enrollments/persons/[personId]
  const parts = url.split("/");
  return parts[parts.length - 1];
}

const handleDelete: LeagueAuthorizedHandler = async (request, context) => {
  try {
    const url = new URL(request.url);
    const personId = extractPersonId(url.pathname);
    const seasonId = url.searchParams.get("seasonId");

    // seasonId can come from query param or body
    let resolvedSeasonId = seasonId;

    if (!resolvedSeasonId) {
      try {
        const body = await request.json();
        const parsed = removeEnrollmentSchema.safeParse(body);
        if (parsed.success) {
          resolvedSeasonId = parsed.data.seasonId;
        }
      } catch {
        // No body provided, check query param only
      }
    }

    if (!resolvedSeasonId) {
      return NextResponse.json(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: "seasonId is required (query param or request body)",
        },
        { status: 400 }
      );
    }

    await enrollmentService.removePerson(
      personId,
      context.leagueId,
      resolvedSeasonId
    );

    return NextResponse.json(
      { message: "Person enrollment removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Enrollments Persons DELETE] Error:", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code: string }).code === "ENROLLMENT_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          status: 404,
          code: "ENROLLMENT_NOT_FOUND",
          message: error.message,
        },
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

export const DELETE = withRateLimit({ type: "admin" })(withLeagueAuth(handleDelete));
