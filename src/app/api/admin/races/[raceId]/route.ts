/**
 * GET /api/admin/races/[raceId] - Get a race by ID
 * PUT /api/admin/races/[raceId] - Update a race
 * DELETE /api/admin/races/[raceId] - Delete a race
 * @see Requirements 4.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { RaceService } from "@/services/race.service";
import { updateRaceSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { RaceModel } from "@/models/race.model";

const raceService = new RaceService();

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const raceId = segments[segments.length - 1];

    const race = await raceService.getById(raceId);

    if (!race) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Race with id "${raceId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: race }, { status: 200 });
  } catch (error) {
    console.error("[Admin Races GET/:id] Error:", error);
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

const handlePut: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const raceId = segments[segments.length - 1];

    const body = await request.json();
    const parsed = updateRaceSchema.safeParse(body);

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

    const race = await raceService.update(raceId, parsed.data);

    return NextResponse.json({ data: race }, { status: 200 });
  } catch (error) {
    console.error("[Admin Races PUT/:id] Error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
      );
    }

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

const handleDelete: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const raceId = segments[segments.length - 1];

    await connectMongoDB();
    const race = await RaceModel.findByIdAndDelete(raceId);

    if (!race) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Race with id "${raceId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Race deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Races DELETE/:id] Error:", error);
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
export const PUT = withRateLimit({ type: "admin" })(withAdmin(handlePut));
export const DELETE = withRateLimit({ type: "admin" })(withAdmin(handleDelete));
