/**
 * GET /api/admin/competitions/[competitionId] - Get a competition by ID
 * PUT /api/admin/competitions/[competitionId] - Update a competition
 * DELETE /api/admin/competitions/[competitionId] - Delete a competition
 * @see Requirements 6.14
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { CompetitionService } from "@/services/competition.service";
import { updateCompetitionSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { CompetitionModel } from "@/models/competition.model";

const competitionService = new CompetitionService();

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const competitionId = url.pathname.split("/").at(-1)!;

    const competition = await competitionService.getById(competitionId);

    if (!competition) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Competition with id "${competitionId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: competition }, { status: 200 });
  } catch (error) {
    console.error("[Admin Competitions GET/:id] Error:", error);
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
    const competitionId = url.pathname.split("/").at(-1)!;

    const body = await request.json();
    const parsed = updateCompetitionSchema.safeParse(body);

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

    const competition = await competitionService.update(competitionId, parsed.data);

    return NextResponse.json({ data: competition }, { status: 200 });
  } catch (error) {
    console.error("[Admin Competitions PUT/:id] Error:", error);

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
    const competitionId = url.pathname.split("/").at(-1)!;

    await connectMongoDB();
    const competition = await CompetitionModel.findByIdAndDelete(competitionId);

    if (!competition) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Competition with id "${competitionId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Competition deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Competitions DELETE/:id] Error:", error);
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
