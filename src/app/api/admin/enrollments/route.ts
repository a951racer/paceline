/**
 * GET /api/admin/enrollments - List enrollments for active league-season (League_Admin+)
 * @see Requirements 3.7, 4.7
 */

import { NextResponse } from "next/server";
import {
  withLeagueAuth,
  type LeagueAuthorizedHandler,
} from "@/middleware/league-auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { EnrollmentService } from "@/services/enrollment.service";
import { PersonModel } from "@/models/person.model";
import { OrganizationModel } from "@/models/organization.model";
import { connectMongoDB } from "@/lib/db/mongodb";
import type { EnrollmentEntityType } from "@/models/enrollment.model";

const enrollmentService = new EnrollmentService();

const handleGet: LeagueAuthorizedHandler = async (request, context) => {
  try {
    const url = new URL(request.url);
    const seasonId = url.searchParams.get("seasonId");
    const type = url.searchParams.get("type") as EnrollmentEntityType | null;

    if (!seasonId) {
      return NextResponse.json(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: "seasonId query parameter is required",
        },
        { status: 400 }
      );
    }

    const enrollments = await enrollmentService.listByLeagueSeason(
      context.leagueId,
      seasonId,
      type || undefined
    );

    // Resolve entity names
    await connectMongoDB();
    const personIds = enrollments
      .filter((e) => e.entityType === "person")
      .map((e) => e.entityId);
    const orgIds = enrollments
      .filter((e) => e.entityType === "organization")
      .map((e) => e.entityId);

    const [persons, orgs] = await Promise.all([
      personIds.length > 0
        ? PersonModel.find({ _id: { $in: personIds } }, { name: 1 }).lean()
        : Promise.resolve([]),
      orgIds.length > 0
        ? OrganizationModel.find({ _id: { $in: orgIds } }, { name: 1 }).lean()
        : Promise.resolve([]),
    ]);

    const nameMap = new Map<string, string>();
    for (const p of persons) {
      nameMap.set(p._id.toString(), `${p.name.first} ${p.name.last}`);
    }
    for (const o of orgs) {
      nameMap.set(o._id.toString(), o.name);
    }

    const enriched = enrollments.map((e) => ({
      ...e.toObject(),
      entityName: nameMap.get(e.entityId.toString()) || e.entityId.toString(),
    }));

    return NextResponse.json({ data: enriched }, { status: 200 });
  } catch (error) {
    console.error("[Admin Enrollments GET] Error:", error);
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

export const GET = withRateLimit({ type: "admin" })(withLeagueAuth(handleGet));
