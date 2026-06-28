/**
 * PUT /api/admin/awards/[awardId] - Update an award
 * DELETE /api/admin/awards/[awardId] - Delete an award
 * @see Requirements 8.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { updateAwardSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { AwardModel } from "@/models/award.model";

const handlePut: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const awardId = url.pathname.split("/").at(-1)!;

    const body = await request.json();
    const parsed = updateAwardSchema.safeParse(body);

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

    await connectMongoDB();
    const award = await AwardModel.findByIdAndUpdate(
      awardId,
      { $set: parsed.data },
      { new: true }
    );

    if (!award) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Award with id "${awardId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: award }, { status: 200 });
  } catch (error) {
    console.error("[Admin Awards PUT/:id] Error:", error);
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
    const awardId = url.pathname.split("/").at(-1)!;

    await connectMongoDB();
    const award = await AwardModel.findByIdAndDelete(awardId);

    if (!award) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Award with id "${awardId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Award deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Awards DELETE/:id] Error:", error);
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

export const PUT = withRateLimit({ type: "admin" })(withAdmin(handlePut));
export const DELETE = withRateLimit({ type: "admin" })(withAdmin(handleDelete));
