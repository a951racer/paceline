/**
 * GET /api/admin/calculated-recognitions - List all calculated recognitions
 * POST /api/admin/calculated-recognitions - Create a new calculated recognition
 * @see Requirements 17.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { CalculatedRecognitionService } from "@/services/calculated-recognition.service";
import { createCalculatedRecognitionSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { CalculatedRecognitionModel } from "@/models/calculated-recognition.model";

const recognitionService = new CalculatedRecognitionService();

const handleGet: AuthenticatedHandler = async () => {
  try {
    await connectMongoDB();
    const recognitions = await CalculatedRecognitionModel.find().sort({
      createdAt: -1,
    });

    return NextResponse.json({ data: recognitions }, { status: 200 });
  } catch (error) {
    console.error("[Admin Calculated Recognitions GET] Error:", error);
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
    const parsed = createCalculatedRecognitionSchema.safeParse(body);

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

    const recognition = await recognitionService.define(parsed.data);

    return NextResponse.json({ data: recognition }, { status: 201 });
  } catch (error) {
    console.error("[Admin Calculated Recognitions POST] Error:", error);
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
