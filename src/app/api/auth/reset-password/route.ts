/**
 * POST /api/auth/reset-password
 * Complete password reset with token and new password.
 * Currently a stub that returns success (actual token validation deferred).
 * @see Requirements 12.4
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRateLimit } from "@/middleware/rate-limit";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

async function handleResetPassword(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

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

    // Stub: Actual token validation and password update to be implemented
    // in a future iteration when email sending is available.
    return NextResponse.json(
      {
        message: "Password has been reset successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Auth ResetPassword] Error:", error);
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

export const POST = withRateLimit({ type: "public" })(handleResetPassword);
