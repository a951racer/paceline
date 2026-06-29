/**
 * GET /api/admin/reference-data - List reference data items for a league and type
 * POST /api/admin/reference-data - Create a new reference data item
 * @see Requirements 8.1, 8.2, 8.6, 8.7
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { ReferenceDataService } from "@/services/reference-data.service";
import { createReferenceDataSchema } from "@/lib/validations/reference-data";
import type { ReferenceDataType } from "@/types";

const referenceDataService = new ReferenceDataService();

const VALID_TYPES: ReferenceDataType[] = [
  "category",
  "race_type",
  "organization_type",
  "person_type",
];

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");
    const type = url.searchParams.get("type");
    const activeOnly = url.searchParams.get("activeOnly");

    if (!leagueId) {
      return NextResponse.json(
        {
          status: 400,
          code: "LEAGUE_REQUIRED",
          message: "leagueId query parameter is required",
        },
        { status: 400 }
      );
    }

    if (!type || !VALID_TYPES.includes(type as ReferenceDataType)) {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_REFERENCE_DATA_TYPE",
          message:
            "type query parameter must be one of: category, race_type, organization_type, person_type",
        },
        { status: 400 }
      );
    }

    const items =
      activeOnly === "true"
        ? await referenceDataService.listActive(
            leagueId,
            type as ReferenceDataType
          )
        : await referenceDataService.listAll(
            leagueId,
            type as ReferenceDataType
          );

    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    console.error("[Admin ReferenceData GET] Error:", error);
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
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");

    if (!leagueId) {
      return NextResponse.json(
        {
          status: 400,
          code: "LEAGUE_REQUIRED",
          message: "leagueId query parameter is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createReferenceDataSchema.safeParse(body);

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

    if (!VALID_TYPES.includes(parsed.data.type as ReferenceDataType)) {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_REFERENCE_DATA_TYPE",
          message:
            "type must be one of: category, race_type, organization_type, person_type",
        },
        { status: 400 }
      );
    }

    const item = await referenceDataService.create({
      ...parsed.data,
      leagueId,
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error & { code?: string; statusCode?: number };

    if (err.code === "REFERENCE_DATA_DUPLICATE_KEY") {
      return NextResponse.json(
        {
          status: 409,
          code: "REFERENCE_DATA_DUPLICATE_KEY",
          message: err.message,
        },
        { status: 409 }
      );
    }

    console.error("[Admin ReferenceData POST] Error:", error);
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
