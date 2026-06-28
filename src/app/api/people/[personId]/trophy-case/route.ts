/**
 * GET /api/people/[personId]/trophy-case - Person's achievements and awards grouped by season
 *
 * Public endpoint - no authentication required.
 * Returns all achievements and awards earned by a person, organized by season.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/rate-limit";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PersonModel } from "@/models/person.model";
import { EarnedAchievementModel } from "@/models/achievement.model";
import { AssignedAwardModel } from "@/models/award.model";
import { SeasonModel } from "@/models/season.model";
import mongoose from "mongoose";

const handleGet = async (request: Request): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    // Extract personId from URL path: /api/people/[personId]/trophy-case
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const trophyCaseIndex = segments.indexOf("trophy-case");
    const personId = segments[trophyCaseIndex - 1];

    // Validate personId format
    if (!personId || !mongoose.Types.ObjectId.isValid(personId)) {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_ID",
          message: "Invalid person ID format",
        },
        { status: 400 }
      );
    }

    // Fetch the person
    const person = await PersonModel.findById(personId);
    if (!person) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: "Person not found",
        },
        { status: 404 }
      );
    }

    // Fetch earned achievements for this person (populated with achievement details)
    const earnedAchievements = await EarnedAchievementModel.find({
      personId,
    }).populate("achievementId");

    // Fetch assigned awards for this person (populated with award details)
    const assignedAwards = await AssignedAwardModel.find({
      recipientId: personId,
    }).populate("awardId");

    // Get all unique season IDs from both achievements and awards
    const seasonIds = new Set<string>();
    for (const ea of earnedAchievements) {
      seasonIds.add(ea.seasonId.toString());
    }
    for (const aa of assignedAwards) {
      seasonIds.add(aa.seasonId.toString());
    }

    // If no achievements or awards, return empty trophy case
    if (seasonIds.size === 0) {
      return NextResponse.json(
        {
          data: {
            personId: person._id.toString(),
            personName: `${person.name.first} ${person.name.last}`,
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

    // Build season map for quick lookup
    const seasonMap = new Map<string, { seasonId: string; seasonName: string }>();
    for (const season of seasons) {
      seasonMap.set(season._id.toString(), {
        seasonId: season._id.toString(),
        seasonName: season.name,
      });
    }

    // Group achievements and awards by season
    const seasonData: Record<
      string,
      {
        seasonId: string;
        seasonName: string;
        achievements: Array<{
          achievementId: Record<string, unknown>;
          earnedAt: Date;
          racesAtTime: number;
        }>;
        awards: Array<{
          awardId: Record<string, unknown>;
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

    // Group achievements by season
    for (const ea of earnedAchievements) {
      const sid = ea.seasonId.toString();
      if (seasonData[sid]) {
        seasonData[sid].achievements.push({
          achievementId: ea.achievementId as unknown as Record<string, unknown>,
          earnedAt: ea.earnedAt,
          racesAtTime: ea.racesAtTime,
        });
      }
    }

    // Group awards by season
    for (const aa of assignedAwards) {
      const sid = aa.seasonId.toString();
      if (seasonData[sid]) {
        seasonData[sid].awards.push({
          awardId: aa.awardId as unknown as Record<string, unknown>,
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
          personId: person._id.toString(),
          personName: `${person.name.first} ${person.name.last}`,
          seasons: orderedSeasons,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Trophy Case - Person GET] Error:", error);
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
