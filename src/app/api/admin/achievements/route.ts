/**
 * GET /api/admin/achievements - List all achievements
 * POST /api/admin/achievements - Create a new achievement
 * @see Requirements 7.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { AchievementService } from "@/services/achievement.service";
import { createAchievementSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { AchievementModel } from "@/models/achievement.model";

const achievementService = new AchievementService();

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    await connectMongoDB();
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");
    const seasonId = url.searchParams.get("seasonId");

    const query: Record<string, unknown> = {};
    if (leagueId) query.leagueId = leagueId;
    if (seasonId) query.seasonId = seasonId;

    const achievements = await AchievementModel.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ data: achievements }, { status: 200 });
  } catch (error) {
    console.error("[Admin Achievements GET] Error:", error);
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
    const parsed = createAchievementSchema.safeParse(body);

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

    const achievement = await achievementService.define(parsed.data);

    return NextResponse.json({ data: achievement }, { status: 201 });
  } catch (error) {
    console.error("[Admin Achievements POST] Error:", error);
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
