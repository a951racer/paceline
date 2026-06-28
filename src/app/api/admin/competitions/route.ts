/**
 * GET /api/admin/competitions - List all competitions (optionally filtered by seasonId)
 * POST /api/admin/competitions - Create a new competition
 * @see Requirements 6.14
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { CompetitionService } from "@/services/competition.service";
import { createCompetitionSchema } from "@/lib/validations";

const competitionService = new CompetitionService();

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const seasonId = url.searchParams.get("seasonId") ?? undefined;

    const competitions = await competitionService.list(seasonId);

    return NextResponse.json({ data: competitions }, { status: 200 });
  } catch (error) {
    console.error("[Admin Competitions GET] Error:", error);
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

const handlePost: AuthenticatedHandler = async (request) => {
  try {
    const body = await request.json();
    const parsed = createCompetitionSchema.safeParse(body);

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

    const competition = await competitionService.create(parsed.data);

    return NextResponse.json({ data: competition }, { status: 201 });
  } catch (error) {
    console.error("[Admin Competitions POST] Error:", error);

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

export const GET = withRateLimit({ type: "admin" })(withAdmin(handleGet));
export const POST = withRateLimit({ type: "admin" })(withAdmin(handlePost));
