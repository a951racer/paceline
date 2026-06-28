/**
 * PUT /api/admin/people/[personId]/roles - Assign roles to a person
 * DELETE /api/admin/people/[personId]/roles - Remove a role from a person
 * @see Requirements 1.2, 1.3, 1.4
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin, type AuthenticatedHandler } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { PersonService } from "@/services/person.service";
import type { Role } from "@/types";

const roleValues = [
  "racer",
  "volunteer",
  "mentor",
  "race_official",
  "administrator",
] as const;

const assignRolesSchema = z.object({
  roles: z.array(z.enum(roleValues)).min(1, "At least one role is required"),
});

const removeRoleSchema = z.object({
  role: z.enum(roleValues),
});

const personService = new PersonService();

function extractPersonId(url: string): string {
  // URL: /api/admin/people/[personId]/roles
  const parts = url.split("/");
  const rolesIndex = parts.indexOf("roles");
  return parts[rolesIndex - 1];
}

const handlePut: AuthenticatedHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const personId = extractPersonId(url.pathname);

    const body = await request.json();
    const parsed = assignRolesSchema.safeParse(body);

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

    const person = await personService.assignRoles(
      personId,
      parsed.data.roles as Role[]
    );

    return NextResponse.json({ data: person }, { status: 200 });
  } catch (error) {
    console.error("[Admin People Roles PUT] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { status: 404, code: "NOT_FOUND", message: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("Invalid role")) {
        return NextResponse.json(
          { status: 400, code: "INVALID_ROLE", message: error.message },
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
    const personId = extractPersonId(url.pathname);

    const body = await request.json();
    const parsed = removeRoleSchema.safeParse(body);

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

    const person = await personService.removeRole(
      personId,
      parsed.data.role as Role
    );

    return NextResponse.json({ data: person }, { status: 200 });
  } catch (error) {
    console.error("[Admin People Roles DELETE] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { status: 404, code: "NOT_FOUND", message: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("does not have role")) {
        return NextResponse.json(
          { status: 400, code: "ROLE_NOT_ASSIGNED", message: error.message },
          { status: 400 }
        );
      }
      if (error.message.includes("Invalid role")) {
        return NextResponse.json(
          { status: 400, code: "INVALID_ROLE", message: error.message },
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

export const PUT = withRateLimit({ type: "admin" })(withAdmin(handlePut));
export const DELETE = withRateLimit({ type: "admin" })(withAdmin(handleDelete));
