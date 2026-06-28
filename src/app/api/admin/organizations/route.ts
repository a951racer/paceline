/**
 * GET /api/admin/organizations - List organizations with optional type filter
 * POST /api/admin/organizations - Create a new organization
 * @see Requirements 2.1
 */

import { NextResponse } from "next/server";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { OrganizationService } from "@/services/organization.service";
import { createOrganizationSchema } from "@/lib/validations";
import type { OrganizationType } from "@/types";

const organizationService = new OrganizationService();

const handleGet: AuthenticatedHandler = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as OrganizationType | null;

    const organizations = await organizationService.list(
      type ?? undefined
    );

    return NextResponse.json({ data: organizations }, { status: 200 });
  } catch (error) {
    console.error("[Admin Organizations GET] Error:", error);
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
    const parsed = createOrganizationSchema.safeParse(body);

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

    const organization = await organizationService.create(parsed.data);

    return NextResponse.json({ data: organization }, { status: 201 });
  } catch (error) {
    console.error("[Admin Organizations POST] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          {
            status: 409,
            code: "DUPLICATE_NAME",
            message: error.message,
          },
          { status: 409 }
        );
      }
      if (error.message.includes("Invalid organization type")) {
        return NextResponse.json(
          {
            status: 400,
            code: "INVALID_TYPE",
            message: error.message,
          },
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

export const GET = withRateLimit({ type: "admin" })(withAdmin(handleGet));
export const POST = withRateLimit({ type: "admin" })(withAdmin(handlePost));
