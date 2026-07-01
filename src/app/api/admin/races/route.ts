/**
 * GET /api/admin/races - List all races
 * POST /api/admin/races - Create a new race
 * @see Requirements 4.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { RaceService } from "@/services/race.service";
import { ReferenceDataService } from "@/services/reference-data.service";
import { createRaceSchema } from "@/lib/validations";

const raceService = new RaceService();
const referenceDataService = new ReferenceDataService();

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");

    const races = leagueId
      ? await raceService.list(leagueId)
      : await raceService.listAll();

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
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");

    if (!leagueId) {
      return NextResponse.json(
        {
          status: 400,
          code: "LEAGUE_REQUIRED",
          message: "leagueId query parameter is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createRaceSchema.safeParse({ ...body, leagueId });

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

    // Runtime reference data validation for raceType
    const raceTypeValid = await referenceDataService.validateKeys(
      leagueId,
      "race_type",
      [parsed.data.raceType]
    );
    if (!raceTypeValid) {
      return NextResponse.json(
        {
          status: 422,
          code: "INVALID_REFERENCE_DATA_KEY",
          message: `Invalid race type: "${parsed.data.raceType}" is not an active reference data key`,
        },
        { status: 422 }
      );
    }

    // Runtime reference data validation for categories
    if (parsed.data.categories && parsed.data.categories.length > 0) {
      const categoriesValid = await referenceDataService.validateKeys(
        leagueId,
        "category",
        parsed.data.categories
      );
      if (!categoriesValid) {
        return NextResponse.json(
          {
            status: 422,
            code: "INVALID_REFERENCE_DATA_KEY",
            message: `One or more categories are not active reference data keys`,
          },
          { status: 422 }
        );
      }
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
