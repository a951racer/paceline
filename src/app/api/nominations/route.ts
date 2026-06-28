/**
 * POST /api/nominations - Submit a peer nomination (authenticated users)
 * @see Requirements 8.6, 8.7
 */

import { z } from "zod";
import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { AwardService } from "@/services/award.service";

const awardService = new AwardService();

const peerNominationSchema = z.object({
  nomineeId: z.string().min(1, "Nominee ID is required"),
  awardId: z.string().min(1, "Award ID is required"),
  seasonId: z.string().min(1, "Season ID is required"),
  reason: z.string().optional(),
});

const handlePost: AuthenticatedHandler = async (request, { userId }) => {
  try {
    const body = await request.json();
    const parsed = peerNominationSchema.safeParse(body);

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

    const { nomineeId, awardId, seasonId, reason } = parsed.data;

    // Check for self-nomination before calling service
    if (userId === nomineeId) {
      return NextResponse.json(
        {
          status: 422,
          code: "SELF_NOMINATION",
          message: "A person cannot nominate themselves",
        },
        { status: 422 }
      );
    }

    const nomination = await awardService.submitNomination({
      nominatorId: userId,
      nomineeId,
      awardId,
      seasonId,
      reason,
    });

    return NextResponse.json({ data: nomination }, { status: 201 });
  } catch (error) {
    // Handle self-nomination error from service layer as well
    if (error instanceof Error && error.message === "A person cannot nominate themselves") {
      return NextResponse.json(
        {
          status: 422,
          code: "SELF_NOMINATION",
          message: "A person cannot nominate themselves",
        },
        { status: 422 }
      );
    }

    console.error("[Nominations POST] Error:", error);
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

export const POST = withRateLimit({ type: "public" })(withAuth(handlePost));
