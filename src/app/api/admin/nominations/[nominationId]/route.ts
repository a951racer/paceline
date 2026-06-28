/**
 * PUT /api/admin/nominations/[nominationId] - Approve or reject a peer nomination
 * @see Requirements 8.8
 */

import { z } from "zod";
import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { AwardService } from "@/services/award.service";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PeerNominationModel } from "@/models/award.model";

const awardService = new AwardService();

const updateNominationSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

const handlePut: AuthenticatedHandler = async (request, context) => {
  try {
    const url = new URL(request.url);
    const nominationId = url.pathname.split("/").at(-1)!;

    const body = await request.json();
    const parsed = updateNominationSchema.safeParse(body);

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

    const { action } = parsed.data;

    if (action === "approve") {
      const assignedAward = await awardService.approveNomination(
        nominationId,
        context.userId
      );
      return NextResponse.json({ data: assignedAward }, { status: 200 });
    }

    // Reject nomination
    await connectMongoDB();
    const nomination = await PeerNominationModel.findById(nominationId);

    if (!nomination) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Nomination with id "${nominationId}" not found`,
        },
        { status: 404 }
      );
    }

    if (nomination.status !== "pending") {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_STATE",
          message: `Nomination is already ${nomination.status} and cannot be rejected`,
        },
        { status: 400 }
      );
    }

    nomination.status = "rejected";
    nomination.reviewedAt = new Date();
    nomination.reviewedBy = context.userId as unknown as typeof nomination.reviewedBy;
    await nomination.save();

    return NextResponse.json({ data: nomination }, { status: 200 });
  } catch (error) {
    console.error("[Admin Nominations PUT/:id] Error:", error);

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

    if (error instanceof Error && error.message.includes("cannot be approved")) {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_STATE",
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

export const PUT = withRateLimit({ type: "admin" })(withAdmin(handlePut));
