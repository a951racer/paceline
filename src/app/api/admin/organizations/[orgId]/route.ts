/**
 * GET /api/admin/organizations/[orgId] - Get an organization by ID
 * PUT /api/admin/organizations/[orgId] - Update an organization
 * DELETE /api/admin/organizations/[orgId] - Delete an organization
 * @see Requirements 2.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { OrganizationService } from "@/services/organization.service";
import { ReferenceDataService } from "@/services/reference-data.service";
import { updateOrganizationSchema } from "@/lib/validations";
import { connectMongoDB } from "@/lib/db/mongodb";
import { OrganizationModel } from "@/models/organization.model";

const organizationService = new OrganizationService();
const referenceDataService = new ReferenceDataService();

function extractOrgId(pathname: string): string {
  // URL: /api/admin/organizations/[orgId]
  const parts = pathname.split("/");
  return parts[parts.length - 1];
}

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const orgId = extractOrgId(url.pathname);

    const organization = await organizationService.getById(orgId);

    if (!organization) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Organization with id "${orgId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: organization }, { status: 200 });
  } catch (error) {
    console.error("[Admin Organizations GET/:id] Error:", error);
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
    const orgId = extractOrgId(url.pathname);
    const leagueId = url.searchParams.get("leagueId");

    const body = await request.json();
    const parsed = updateOrganizationSchema.safeParse(body);

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

    // Runtime reference data validation for organization type
    if (leagueId && parsed.data.type) {
      const typeValid = await referenceDataService.validateKeys(
        leagueId,
        "organization_type",
        [parsed.data.type]
      );
      if (!typeValid) {
        return NextResponse.json(
          {
            status: 422,
            code: "INVALID_REFERENCE_DATA_KEY",
            message: `Invalid organization type: "${parsed.data.type}" is not an active reference data key`,
          },
          { status: 422 }
        );
      }
    }

    const organization = await organizationService.update(orgId, parsed.data);

    return NextResponse.json({ data: organization }, { status: 200 });
  } catch (error) {
    console.error("[Admin Organizations PUT/:id] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { status: 404, code: "NOT_FOUND", message: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { status: 409, code: "DUPLICATE_NAME", message: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes("Invalid organization type")) {
        return NextResponse.json(
          { status: 400, code: "INVALID_TYPE", message: error.message },
          { status: 400 }
        );
      }
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
    const orgId = extractOrgId(url.pathname);

    await connectMongoDB();
    const organization = await OrganizationModel.findByIdAndDelete(orgId);

    if (!organization) {
      return NextResponse.json(
        {
          status: 404,
          code: "NOT_FOUND",
          message: `Organization with id "${orgId}" not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Organization deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Organizations DELETE/:id] Error:", error);
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
