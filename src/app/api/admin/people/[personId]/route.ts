/**
 * GET /api/admin/people/[personId] - Get a person by ID
 * PUT /api/admin/people/[personId] - Update a person
 * DELETE /api/admin/people/[personId] - Delete a person
 * @see Requirements 1.1, 1.2, 9.5, 2.5
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { PersonService } from "@/services/person.service";
import { ReferenceDataService } from "@/services/reference-data.service";
import { updatePersonSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PersonModel } from "@/models/person.model";

const personService = new PersonService();
const referenceDataService = new ReferenceDataService();

type RouteContext = { params: Promise<{ personId: string }> };

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const personId = url.pathname.split("/").at(-1)!;

    const person = await personService.getById(personId);

    if (!person) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Person with id "${personId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: person }, { status: 200 });
  } catch (error) {
    console.error("[Admin People GET/:id] Error:", error);
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

const handlePut: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const personId = url.pathname.split("/").at(-1)!;

    const body = await request.json();
    const parsed = updatePersonSchema.safeParse(body);

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
    if (parsed.data.personTypes && parsed.data.personTypes.length > 0) {
      const leagueId = url.searchParams.get("leagueId");

      if (leagueId) {
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
    }

    const person = await personService.update(personId, parsed.data);

    return NextResponse.json({ data: person }, { status: 200 });
  } catch (error) {
    console.error("[Admin People PUT/:id] Error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
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

const handleDelete: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const personId = url.pathname.split("/").at(-1)!;

    await connectMongoDB();
    const person = await PersonModel.findByIdAndDelete(personId);

    if (!person) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Person with id "${personId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Person deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin People DELETE/:id] Error:", error);
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
export const PUT = withRateLimit({ type: "admin" })(withAdmin(handlePut));
export const DELETE = withRateLimit({ type: "admin" })(withAdmin(handleDelete));
