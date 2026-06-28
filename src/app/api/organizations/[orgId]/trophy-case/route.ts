/**
 * GET /api/organizations/[orgId]/trophy-case - Team trophy case aggregating member accomplishments
 *
 * Public endpoint - no authentication required.
 * Returns all achievements and awards earned by current team members,
 * attributed to the individual who earned it, grouped by season.
 *
 * Since the team trophy case is computed dynamically from current memberIds,
 * membership changes (add/remove) automatically reflect in the response.
 *
 * @see Requirements 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { connectMongoDB } from "@/lib/db/mongodb";
import { OrganizationModel } from "@/models/organization.model";
import { PersonModel } from "@/models/person.model";
import { EarnedAchievementModel } from "@/models/achievement.model";
import { AssignedAwardModel } from "@/models/award.model";
import { SeasonModel } from "@/models/season.model";
import mongoose from "mongoose";

const handleGet = async (request: Request): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    // Extract orgId from URL path: /api/organizations/[orgId]/trophy-case
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const trophyCaseIndex = segments.indexOf("trophy-case");
    const orgId = segments[trophyCaseIndex - 1];

    // Validate orgId format
    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_ID",
          message: "Invalid organization ID format",
        },
        { status: 400 }
      );
    }

    // Fetch the organization
    const organization = await OrganizationModel.findById(orgId);
    if (!organization) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: "Organization not found",
        },
        { status: 404 }
      );
    }

    // Verify it's a team-type organization
    if (organization.type !== "team") {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_ORG_TYPE",
          message: "Trophy case is only available for team-type organizations",
        },
        { status: 400 }
      );
    }

    const memberIds = organization.memberIds;

    // If the team has no members, return empty trophy case
    if (!memberIds || memberIds.length === 0) {
      return NextResponse.json(
        {
          data: {
            organizationId: organization._id.toString(),
            organizationName: organization.name,
            seasons: [],
          },
        },
        { status: 200 }
      );
    }

    // Fetch person details for attribution
    const members = await PersonModel.find({
      _id: { $in: memberIds },
    });
    const memberMap = new Map<string, { personId: string; personName: string }>();
    for (const member of members) {
      memberMap.set(member._id.toString(), {
        personId: member._id.toString(),
        personName: `${member.name.first} ${member.name.last}`,
      });
    }

    // Fetch earned achievements for all current members (populated with achievement details)
    const earnedAchievements = await EarnedAchievementModel.find({
      personId: { $in: memberIds },
    }).populate("achievementId");

    // Fetch assigned awards for all current members (populated with award details)
    const assignedAwards = await AssignedAwardModel.find({
      recipientId: { $in: memberIds },
    }).populate("awardId");

    // Get all unique season IDs
    const seasonIds = new Set<string>();
    for (const ea of earnedAchievements) {
      seasonIds.add(ea.seasonId.toString());
    }
    for (const aa of assignedAwards) {
      seasonIds.add(aa.seasonId.toString());
    }

    // If no achievements or awards from any member, return empty
    if (seasonIds.size === 0) {
      return NextResponse.json(
        {
          data: {
            organizationId: organization._id.toString(),
            organizationName: organization.name,
            seasons: [],
          },
        },
        { status: 200 }
      );
    }

    // Fetch season details
    const seasons = await SeasonModel.find({
      _id: { $in: Array.from(seasonIds) },
    }).sort({ startDate: -1 });

    // Build season map
    const seasonMap = new Map<string, { seasonId: string; seasonName: string }>();
    for (const season of seasons) {
      seasonMap.set(season._id.toString(), {
        seasonId: season._id.toString(),
        seasonName: season.name,
      });
    }

    // Group achievements and awards by season with person attribution
    const seasonData: Record<
      string,
      {
        seasonId: string;
        seasonName: string;
        achievements: Array<{
          achievementId: Record<string, unknown>;
          personId: { personId: string; personName: string };
          earnedAt: Date;
        }>;
        awards: Array<{
          awardId: Record<string, unknown>;
          personId: { personId: string; personName: string };
          assignedAt: Date;
          source: string;
        }>;
      }
    > = {};

    // Initialize season entries
    for (const [id, info] of seasonMap.entries()) {
      seasonData[id] = {
        seasonId: info.seasonId,
        seasonName: info.seasonName,
        achievements: [],
        awards: [],
      };
    }

    // Group achievements by season with person attribution
    for (const ea of earnedAchievements) {
      const sid = ea.seasonId.toString();
      const pid = ea.personId.toString();
      if (seasonData[sid]) {
        seasonData[sid].achievements.push({
          achievementId: ea.achievementId as unknown as Record<string, unknown>,
          personId: memberMap.get(pid) || { personId: pid, personName: "Unknown" },
          earnedAt: ea.earnedAt,
        });
      }
    }

    // Group awards by season with person attribution
    for (const aa of assignedAwards) {
      const sid = aa.seasonId.toString();
      const pid = aa.recipientId.toString();
      if (seasonData[sid]) {
        seasonData[sid].awards.push({
          awardId: aa.awardId as unknown as Record<string, unknown>,
          personId: memberMap.get(pid) || { personId: pid, personName: "Unknown" },
          assignedAt: aa.assignedAt,
          source: aa.source,
        });
      }
    }

    // Convert to array ordered by season startDate descending
    const orderedSeasons = seasons
      .map((season) => seasonData[season._id.toString()])
      .filter(Boolean);

    return NextResponse.json(
      {
        data: {
          organizationId: organization._id.toString(),
          organizationName: organization.name,
          seasons: orderedSeasons,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Trophy Case - Organization GET] Error:", error);
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

export const GET = withRateLimit({ type: "public" })(handleGet);
