/**
 * GET /api/admin/awards - List all awards
 * POST /api/admin/awards - Create a new award
 * @see Requirements 8.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { AwardService } from "@/services/award.service";
import { createAwardSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { AwardModel } from "@/models/award.model";

const awardService = new AwardService();

const handleGet: AuthenticatedHandler = async () => {
  try {
    await connectMongoDB();
    const awards = await AwardModel.find().sort({ createdAt: -1 });

    return NextResponse.json({ data: awards }, { status: 200 });
  } catch (error) {
    console.error("[Admin Awards GET] Error:", error);
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
    const parsed = createAwardSchema.safeParse(body);

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

    const award = await awardService.define(parsed.data);

    return NextResponse.json({ data: award }, { status: 201 });
  } catch (error) {
    console.error("[Admin Awards POST] Error:", error);
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
