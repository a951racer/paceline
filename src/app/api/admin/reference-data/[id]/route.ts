/**
 * PUT /api/admin/reference-data/[id] - Update a reference data item
 * DELETE /api/admin/reference-data/[id] - Delete a reference data item (if unreferenced)
 * @see Requirements 8.3, 8.4, 8.5, 8.6
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { updateReferenceDataSchema } from "@/lib/validations/reference-data";
import { ReferenceDataService } from "@/services/reference-data.service";

const referenceDataService = new ReferenceDataService();

const handlePut: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split("/").at(-1)!;

    const body = await request.json();
    const parsed = updateReferenceDataSchema.safeParse(body);

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

    const item = await referenceDataService.update(id, parsed.data);

    return NextResponse.json({ data: item }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error & { code?: string; statusCode?: number };

    if (err.code === "REFERENCE_DATA_NOT_FOUND") {
      return NextResponse.json(
        {
          status: 404,
          code: "REFERENCE_DATA_NOT_FOUND",
          message: err.message,
        },
        { status: 404 }
      );
    }

    console.error("[Admin ReferenceData PUT/:id] Error:", error);
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
    const id = url.pathname.split("/").at(-1)!;

    await referenceDataService.delete(id);

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const err = error as Error & { code?: string; statusCode?: number };

    if (err.code === "REFERENCE_DATA_NOT_FOUND") {
      return NextResponse.json(
        {
          status: 404,
          code: "REFERENCE_DATA_NOT_FOUND",
          message: err.message,
        },
        { status: 404 }
      );
    }

    if (err.code === "REFERENCE_DATA_IN_USE") {
      return NextResponse.json(
        {
          status: 409,
          code: "REFERENCE_DATA_IN_USE",
          message: err.message,
        },
        { status: 409 }
      );
    }

    console.error("[Admin ReferenceData DELETE/:id] Error:", error);
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
