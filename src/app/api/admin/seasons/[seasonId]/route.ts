/**
 * GET /api/admin/seasons/[seasonId] - Get a season by ID
 * PUT /api/admin/seasons/[seasonId] - Update a season
 * DELETE /api/admin/seasons/[seasonId] - Delete a season
 * @see Requirements 18.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { SeasonService } from "@/services/season.service";
import { updateSeasonSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { SeasonModel } from "@/models/season.model";

const seasonService = new SeasonService();

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const seasonId = url.pathname.split("/").at(-1)!;

    const season = await seasonService.getById(seasonId);

    if (!season) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Season with id "${seasonId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: season }, { status: 200 });
  } catch (error) {
    console.error("[Admin Seasons GET/:id] Error:", error);
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
    const seasonId = url.pathname.split("/").at(-1)!;

    const body = await request.json();
    const parsed = updateSeasonSchema.safeParse(body);

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

    // If date range is being updated, validate no overlap
    if (parsed.data.startDate || parsed.data.endDate) {
      const existing = await seasonService.getById(seasonId);
      if (!existing) {
        return NextResponse.json(
          {
            status: 404,
            code: "NOT_FOUND",
            message: `Season with id "${seasonId}" not found`,
          },
          { status: 404 }
        );
      }

      const startDate = parsed.data.startDate ?? existing.startDate;
      const endDate = parsed.data.endDate ?? existing.endDate;

      const isValid = await seasonService.validateNoOverlap(
        startDate,
        endDate,
        seasonId
      );
      if (!isValid) {
        return NextResponse.json(
          {
            status: 409,
            code: "SEASON_OVERLAP",
            message:
              "Season date range overlaps with an existing season. Please choose a non-overlapping date range.",
          },
          { status: 409 }
        );
      }
    }

    await connectMongoDB();
    const season = await SeasonModel.findByIdAndUpdate(
      seasonId,
      { $set: parsed.data },
      { returnDocument: "after", runValidators: true }
    );

    if (!season) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Season with id "${seasonId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: season }, { status: 200 });
  } catch (error) {
    console.error("[Admin Seasons PUT/:id] Error:", error);

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

const handleDelete: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const seasonId = url.pathname.split("/").at(-1)!;

    await connectMongoDB();
    const season = await SeasonModel.findByIdAndDelete(seasonId);

    if (!season) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Season with id "${seasonId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Season deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Seasons DELETE/:id] Error:", error);
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
