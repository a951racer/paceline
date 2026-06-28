/**
 * POST /api/auth/forgot-password
 * Initiate password reset flow.
 * Currently a stub that returns success (actual email sending deferred).
 * @see Requirements 12.3
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRateLimit } from "@/middleware/rate-limit";

const forgotPasswordSchema = z.object({
  email: z.string().email("Must be a valid email address"),
});

async function handleForgotPassword(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

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

    // Stub: Always return success to prevent email enumeration.
    // Actual email sending to be implemented in a future iteration.
    return NextResponse.json(
      {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Auth ForgotPassword] Error:", error);
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

export const POST = withRateLimit({ type: "public" })(handleForgotPassword);
