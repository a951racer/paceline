/**
 * POST /api/admin/awards/assign - Assign an award to a person
 * @see Requirements 8.1, 8.2, 8.3
 */

import { z } from "zod";
import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { AwardService } from "@/services/award.service";

const awardService = new AwardService();

const assignAwardSchema = z.object({
  awardId: z.string().min(1, "Award ID is required"),
  personId: z.string().min(1, "Person ID is required"),
  seasonId: z.string().min(1, "Season ID is required"),
});

const handlePost: AuthenticatedHandler = async (request) => {
  try {
    const body = await request.json();
    const parsed = assignAwardSchema.safeParse(body);

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

    const { awardId, personId, seasonId } = parsed.data;
    const assignedAward = await awardService.assign(awardId, personId, seasonId);

    return NextResponse.json({ data: assignedAward }, { status: 201 });
  } catch (error) {
    console.error("[Admin Awards Assign POST] Error:", error);
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

export const POST = withRateLimit({ type: "admin" })(withAdmin(handlePost));
