/**
 * POST /api/auth/google
 * Google OAuth login.
 * Currently a stub that accepts a token and returns a placeholder response.
 * Actual Google OAuth integration deferred.
 * @see Requirements 12.9
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRateLimit } from "@/middleware/rate-limit";

const googleAuthSchema = z.object({
  token: z.string().min(1, "Google OAuth token is required"),
});

async function handleGoogleAuth(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = googleAuthSchema.safeParse(body);

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

    // Stub: Actual Google OAuth token verification and user lookup/creation
    // to be implemented in a future iteration.
    return NextResponse.json(
      {
        status: 501,
        code: "NOT_IMPLEMENTED",
        message:
          "Google OAuth login is not yet implemented. Please use email/password login.",
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("[Auth Google] Error:", error);
    return NextResponse.json(
      {
        status: 500,
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit({ type: "public" })(handleGoogleAuth);
