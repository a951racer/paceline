/**
 * GET /api/user/leagues - Return leagues available to the current user
 * - For Super_Admin: return all leagues
 * - For League_Admin: return only assigned leagues
 * - For non-admin: return leagues where user has at least one enrollment
 * @see Requirements 6.2, 6.3, 12.9
 */

import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { LeagueService } from "@/services/league.service";
import { LeagueAuthorizationService } from "@/services/league-authorization.service";
import { EnrollmentService } from "@/services/enrollment.service";
import { LeagueModel } from "@/models/league.model";
import { connectMongoDB } from "@/lib/db/mongodb";

const leagueService = new LeagueService();
const leagueAuthService = new LeagueAuthorizationService();
const enrollmentService = new EnrollmentService();

const handleGet: AuthenticatedHandler = async (_request, context) => {
  try {
    // Check if Super_Admin
    const isSuperAdmin = await leagueAuthService.isSuperAdmin(context.userId);
    if (isSuperAdmin) {
      const leagues = await leagueService.listAll();
      return NextResponse.json({ data: leagues }, { status: 200 });
    }

    // Check if League_Admin
    const adminLeagueIds = await leagueAuthService.getAdminLeagues(context.userId);
    if (adminLeagueIds.length > 0) {
      await connectMongoDB();
      const leagues = await LeagueModel.find({
        _id: { $in: adminLeagueIds },
      }).sort({ name: 1 });
      return NextResponse.json({ data: leagues }, { status: 200 });
    }

    // Non-admin: return leagues where user has at least one enrollment
    const enrollments = await enrollmentService.getPersonEnrollments(context.userId);
    const leagueIds = [...new Set(enrollments.map((e) => e.leagueId.toString()))];

    if (leagueIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    await connectMongoDB();
    const leagues = await LeagueModel.find({
      _id: { $in: leagueIds },
      isActive: true,
    }).sort({ name: 1 });

    return NextResponse.json({ data: leagues }, { status: 200 });
  } catch (error) {
    console.error("[User Leagues GET] Error:", error);
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

export const GET = withRateLimit({ type: "admin" })(withAuth(handleGet));
