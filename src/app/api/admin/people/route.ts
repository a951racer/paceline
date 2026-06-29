/**
 * GET /api/admin/people - List people with optional filters
 * POST /api/admin/people - Create a new person
 * @see Requirements 1.1, 1.2, 9.5, 2.5
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { PersonService } from "@/services/person.service";
import { ReferenceDataService } from "@/services/reference-data.service";
import { createPersonSchema } from "@/lib/validations";
import type { Role, Category } from "@/types";

const personService = new PersonService();
const referenceDataService = new ReferenceDataService();

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const rolesParam = searchParams.get("roles");
    const category = searchParams.get("category") as Category | null;
    const name = searchParams.get("name");
    const organizationId = searchParams.get("organizationId");

    const filters: {
      roles?: Role[];
      category?: Category;
      name?: string;
      organizationId?: string;
    } = {};

    if (rolesParam) {
      filters.roles = rolesParam.split(",") as Role[];
    }
    if (category) {
      filters.category = category;
    }
    if (name) {
      filters.name = name;
    }
    if (organizationId) {
      filters.organizationId = organizationId;
    }

    const people = await personService.list(filters);

    return NextResponse.json({ data: people }, { status: 200 });
  } catch (error) {
    console.error("[Admin People GET] Error:", error);
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
    const parsed = createPersonSchema.safeParse(body);

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

    // Runtime reference data validation for personTypes
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");

    if (leagueId && parsed.data.personTypes && parsed.data.personTypes.length > 0) {
      const personTypesValid = await referenceDataService.validateKeys(
        leagueId,
        "person_type",
        parsed.data.personTypes
      );
      if (!personTypesValid) {
        return NextResponse.json(
          {
            status: 422,
            code: "INVALID_REFERENCE_DATA_KEY",
            message: `One or more person types are not active reference data keys`,
          },
          { status: 422 }
        );
      }
    }

    const person = await personService.create(parsed.data);

    return NextResponse.json({ data: person }, { status: 201 });
  } catch (error) {
    console.error("[Admin People POST] Error:", error);

    if (error instanceof Error && error.message.includes("Invalid role")) {
      return NextResponse.json(
        {
          status: 400,
          code: "INVALID_ROLE",
          message: error.message,
        },
        { status: 400 }
      );
    }

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
