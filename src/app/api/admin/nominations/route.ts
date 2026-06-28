/**
 * GET /api/admin/nominations - List peer nominations (filterable by status)
 * @see Requirements 8.8
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PeerNominationModel } from "@/models/award.model";

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;

    await connectMongoDB();

    const filter: Record<string, string> = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const nominations = await PeerNominationModel.find(filter)
      .populate("nominatorId", "name email")
      .populate("nomineeId", "name email")
      .populate("awardId", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ data: nominations }, { status: 200 });
  } catch (error) {
    console.error("[Admin Nominations GET] Error:", error);
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
