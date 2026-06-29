/**
 * GET /api/organizations/[orgId]/trophy-case - Team trophy case aggregating member accomplishments
 *
 * Public endpoint - no authentication required.
 * Returns all achievements and awards earned by current team members,
 * attributed to the individual who earned it, grouped by league then season.
 * Displays entries from all leagues regardless of active context.
 *
 * Since the team trophy case is computed dynamically from current memberIds,
 * membership changes (add/remove) automatically reflect in the response.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.5
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { connectMongoDB } from "@/lib/db/mongodb";
import { OrganizationModel } from "@/models/organization.model";
import { PersonModel } from "@/models/person.model";
import { EarnedAchievementModel } from "@/models/achievement.model";
import { AssignedAwardModel } from "@/models/award.model";
import { SeasonModel } from "@/models/season.model";
import { LeagueModel } from "@/models/league.model";
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
            leagues: [],
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

    // Collect all unique leagueIds and seasonIds
    const leagueIds = new Set<string>();
    const seasonIds = new Set<string>();

    for (const ea of earnedAchievements) {
      if (ea.leagueId) leagueIds.add(ea.leagueId.toString());
      seasonIds.add(ea.seasonId.toString());
    }
    for (const aa of assignedAwards) {
      if (aa.leagueId) leagueIds.add(aa.leagueId.toString());
      seasonIds.add(aa.seasonId.toString());
    }

    // If no achievements or awards from any member, return empty
    if (seasonIds.size === 0) {
      return NextResponse.json(
        {
          data: {
            organizationId: organization._id.toString(),
            organizationName: organization.name,
            leagues: [],
          },
        },
        { status: 200 }
      );
    }

    // Fetch league details
    const leagues = await LeagueModel.find({
      _id: { $in: Array.from(leagueIds) },
    });
    const leagueMap = new Map<string, { leagueId: string; leagueName: string }>();
    for (const league of leagues) {
      leagueMap.set(league._id.toString(), {
        leagueId: league._id.toString(),
        leagueName: league.name,
      });
    }

    // Fetch season details
    const seasons = await SeasonModel.find({
      _id: { $in: Array.from(seasonIds) },
    }).sort({ startDate: -1 });

    const seasonMap = new Map<string, { seasonId: string; seasonName: string; startDate: Date }>();
    for (const season of seasons) {
      seasonMap.set(season._id.toString(), {
        seasonId: season._id.toString(),
        seasonName: season.name,
        startDate: season.startDate,
      });
    }

    // Group by league, then by season within each league
    const leagueData: Record<
      string,
      {
        leagueId: string;
        leagueName: string;
        seasons: Record<
          string,
          {
            seasonId: string;
            seasonName: string;
            startDate: Date;
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
        >;
      }
    > = {};

    // Group achievements by league then season with person attribution
    for (const ea of earnedAchievements) {
      const lid = ea.leagueId ? ea.leagueId.toString() : "unknown";
      const sid = ea.seasonId.toString();
      const pid = ea.personId.toString();

      if (!leagueData[lid]) {
        const leagueInfo = leagueMap.get(lid);
        leagueData[lid] = {
          leagueId: leagueInfo?.leagueId ?? lid,
          leagueName: leagueInfo?.leagueName ?? "Unknown League",
          seasons: {},
        };
      }

      if (!leagueData[lid].seasons[sid]) {
        const seasonInfo = seasonMap.get(sid);
        leagueData[lid].seasons[sid] = {
          seasonId: seasonInfo?.seasonId ?? sid,
          seasonName: seasonInfo?.seasonName ?? "Unknown Season",
          startDate: seasonInfo?.startDate ?? new Date(0),
          achievements: [],
          awards: [],
        };
      }

      leagueData[lid].seasons[sid].achievements.push({
        achievementId: ea.achievementId as unknown as Record<string, unknown>,
        personId: memberMap.get(pid) || { personId: pid, personName: "Unknown" },
        earnedAt: ea.earnedAt,
      });
    }

    // Group awards by league then season with person attribution
    for (const aa of assignedAwards) {
      const lid = aa.leagueId ? aa.leagueId.toString() : "unknown";
      const sid = aa.seasonId.toString();
      const pid = aa.recipientId.toString();

      if (!leagueData[lid]) {
        const leagueInfo = leagueMap.get(lid);
        leagueData[lid] = {
          leagueId: leagueInfo?.leagueId ?? lid,
          leagueName: leagueInfo?.leagueName ?? "Unknown League",
          seasons: {},
        };
      }

      if (!leagueData[lid].seasons[sid]) {
        const seasonInfo = seasonMap.get(sid);
        leagueData[lid].seasons[sid] = {
          seasonId: seasonInfo?.seasonId ?? sid,
          seasonName: seasonInfo?.seasonName ?? "Unknown Season",
          startDate: seasonInfo?.startDate ?? new Date(0),
          achievements: [],
          awards: [],
        };
      }

      leagueData[lid].seasons[sid].awards.push({
        awardId: aa.awardId as unknown as Record<string, unknown>,
        personId: memberMap.get(pid) || { personId: pid, personName: "Unknown" },
        assignedAt: aa.assignedAt,
        source: aa.source,
      });
    }

    // Convert to ordered array: leagues sorted by name, seasons sorted by startDate descending
    const orderedLeagues = Object.values(leagueData)
      .sort((a, b) => a.leagueName.localeCompare(b.leagueName))
      .map((league) => ({
        leagueId: league.leagueId,
        leagueName: league.leagueName,
        seasons: Object.values(league.seasons).sort(
          (a, b) => b.startDate.getTime() - a.startDate.getTime()
        ),
      }));

    return NextResponse.json(
      {
        data: {
          organizationId: organization._id.toString(),
          organizationName: organization.name,
          leagues: orderedLeagues,
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
