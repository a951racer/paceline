/**
 * PUT /api/admin/achievements/[achievementId] - Update an achievement
 * DELETE /api/admin/achievements/[achievementId] - Delete an achievement
 * @see Requirements 7.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { updateAchievementSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { AchievementModel } from "@/models/achievement.model";

const handlePut: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const achievementId = url.pathname.split("/").at(-1)!;

    const body = await request.json();
    const parsed = updateAchievementSchema.safeParse(body);

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

    await connectMongoDB();
    const achievement = await AchievementModel.findByIdAndUpdate(
      achievementId,
      { $set: parsed.data },
      { new: true }
    );

    if (!achievement) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Achievement with id "${achievementId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: achievement }, { status: 200 });
  } catch (error) {
    console.error("[Admin Achievements PUT/:id] Error:", error);
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

const handleDelete: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const achievementId = url.pathname.split("/").at(-1)!;

    await connectMongoDB();
    const achievement = await AchievementModel.findByIdAndDelete(achievementId);

    if (!achievement) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Achievement with id "${achievementId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Achievement deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Achievements DELETE/:id] Error:", error);
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
export const DELETE = withRateLimit({ type: "admin" })(withAdmin(handleDelete));
