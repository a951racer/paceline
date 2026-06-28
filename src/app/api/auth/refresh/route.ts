/**
 * POST /api/auth/refresh
 * Refresh access token using a valid refresh token.
 * @see Requirements 12.1
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { refreshTokens, AuthError } from "@/lib/auth";
import { withRateLimit } from "@/middleware/rate-limit";

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

async function handleRefresh(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = refreshSchema.safeParse(body);

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

    const { refreshToken } = parsed.data;

    const tokenPair = refreshTokens(refreshToken);

    return NextResponse.json(
      {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          status: 401,
          code: error.code,
          message: error.message,
        },
        { status: 401 }
      );
    }

    console.error("[Auth Refresh] Error:", error);
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

export const POST = withRateLimit({ type: "public" })(handleRefresh);
