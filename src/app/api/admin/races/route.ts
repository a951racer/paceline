/**
 * GET /api/admin/races - List all races
 * POST /api/admin/races - Create a new race
 * @see Requirements 4.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { RaceService } from "@/services/race.service";
import { createRaceSchema } from "@/lib/validations";

const raceService = new RaceService();

const handleGet: AuthenticatedHandler = async () => {
  try {
    const races = await raceService.list();

    return NextResponse.json({ data: races }, { status: 200 });
  } catch (error) {
    console.error("[Admin Races GET] Error:", error);
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
    const parsed = createRaceSchema.safeParse(body);

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

    const race = await raceService.create(parsed.data);

    return NextResponse.json({ data: race }, { status: 201 });
  } catch (error) {
    console.error("[Admin Races POST] Error:", error);

    if (error instanceof Error && error.message.includes("Invalid race type")) {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_RACE_TYPE",
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("No season found")) {
      return NextResponse.json(
        {
          status: 400,
          code: "NO_MATCHING_SEASON",
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

export const GET = withRateLimit({ type: "admin" })(withAdmin(handleGet));
export const POST = withRateLimit({ type: "admin" })(withAdmin(handlePost));
