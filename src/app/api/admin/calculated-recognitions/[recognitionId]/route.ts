/**
 * PUT /api/admin/calculated-recognitions/[recognitionId] - Update a calculated recognition
 * DELETE /api/admin/calculated-recognitions/[recognitionId] - Delete a calculated recognition
 * @see Requirements 17.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { updateCalculatedRecognitionSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { CalculatedRecognitionModel } from "@/models/calculated-recognition.model";

const handlePut: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const recognitionId = url.pathname.split("/").at(-1)!;

    const body = await request.json();
    const parsed = updateCalculatedRecognitionSchema.safeParse(body);

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
    const recognition = await CalculatedRecognitionModel.findByIdAndUpdate(
      recognitionId,
      { $set: parsed.data },
      { new: true }
    );

    if (!recognition) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Calculated recognition with id "${recognitionId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: recognition }, { status: 200 });
  } catch (error) {
    console.error("[Admin Calculated Recognitions PUT/:id] Error:", error);
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
    const recognitionId = url.pathname.split("/").at(-1)!;

    await connectMongoDB();
    const recognition =
      await CalculatedRecognitionModel.findByIdAndDelete(recognitionId);

    if (!recognition) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Calculated recognition with id "${recognitionId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Calculated recognition deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Calculated Recognitions DELETE/:id] Error:", error);
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
