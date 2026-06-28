/**
 * GET /api/admin/races/[raceId]/results - Get results for a race
 * POST /api/admin/races/[raceId]/results - Enter race results (batch)
 * @see Requirements 5.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { RaceResultService } from "@/services/race-result.service";
import { z } from "zod";

const raceResultService = new RaceResultService();

/** Schema for batch result entry - array of results without raceId/seasonId (derived from URL/race) */
const batchResultEntrySchema = z.array(
  z.object({
    racerId: z.string().min(1, "Racer ID is required"),
    category: z.enum(["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"]),
    position: z.number().int().min(1, "Position must be at least 1"),
    finishTime: z.number().min(0, "Finish time must be non-negative"),
    points: z.number().optional(),
  })
);

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    // URL pattern: /api/admin/races/[raceId]/results
    const segments = url.pathname.split("/");
    const raceId = segments[segments.length - 2];

    const results = await raceResultService.getByRace(raceId);

    return NextResponse.json({ data: results }, { status: 200 });
  } catch (error) {
    console.error("[Admin Race Results GET] Error:", error);
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
    // URL pattern: /api/admin/races/[raceId]/results
    const segments = url.pathname.split("/");
    const raceId = segments[segments.length - 2];

    const body = await request.json();
    const parsed = batchResultEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid input. Expected an array of race results.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    if (parsed.data.length === 0) {
      return NextResponse.json(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: "At least one result is required",
        },
        { status: 400 }
      );
    }

    const response = await raceResultService.enter(raceId, parsed.data);

    // Return 201 if at least some results were entered, 400 if all failed
    if (response.successful.length === 0 && response.errors.length > 0) {
      return NextResponse.json(
        {
          status: 400,
          code: "ALL_RESULTS_FAILED",
          message: "All result entries failed",
          data: response,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: response }, { status: 201 });
  } catch (error) {
    console.error("[Admin Race Results POST] Error:", error);

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
