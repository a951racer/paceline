/**
 * POST /api/admin/organizations/[orgId]/members - Add a member to an organization
 * DELETE /api/admin/organizations/[orgId]/members - Remove a member from an organization
 * @see Requirements 2.2, 2.5
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { OrganizationService } from "@/services/organization.service";

const memberSchema = z.object({
  personId: z.string().min(1, "Person ID is required"),
});

const organizationService = new OrganizationService();

function extractOrgId(pathname: string): string {
  // URL: /api/admin/organizations/[orgId]/members
  const parts = pathname.split("/");
  const membersIndex = parts.indexOf("members");
  return parts[membersIndex - 1];
}

const handlePost: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const orgId = extractOrgId(url.pathname);

    const body = await request.json();
    const parsed = memberSchema.safeParse(body);

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

    await organizationService.addMember(orgId, parsed.data.personId);

    return NextResponse.json(
      { message: "Member added successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Org Members POST] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { status: 404, code: "NOT_FOUND", message: error.message },
          { status: 404 }
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

    const body = await request.json();
    const parsed = memberSchema.safeParse(body);

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

    await organizationService.removeMember(orgId, parsed.data.personId);

    return NextResponse.json(
      { message: "Member removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Org Members DELETE] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { status: 404, code: "NOT_FOUND", message: error.message },
          { status: 404 }
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

export const POST = withRateLimit({ type: "admin" })(withAdmin(handlePost));
export const DELETE = withRateLimit({ type: "admin" })(withAdmin(handleDelete));
