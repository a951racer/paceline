/**
 * POST /api/auth/login
 * Email/password login - validates credentials and returns JWT token pair.
 * @see Requirements 12.1
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PersonModel } from "@/models/person.model";
import { generateTokenPair, comparePassword } from "@/lib/auth";
import { withRateLimit } from "@/middleware/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

async function handleLogin(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

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

    const { email, password } = parsed.data;

    await connectMongoDB();

    const person = await PersonModel.findOne({ email: email.toLowerCase() });

    if (!person || !person.passwordHash) {
      return NextResponse.json(
        {
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    const isPasswordValid = await comparePassword(password, person.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    const tokenPair = generateTokenPair({
      userId: person._id.toString(),
      email: person.email,
      roles: person.roles,
      adminScope: person.adminScope,
    });

    return NextResponse.json(
      {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user: {
          id: person._id.toString(),
          name: person.name,
          email: person.email,
          roles: person.roles,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Auth Login] Error:", error);
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

export const POST = withRateLimit({ type: "public" })(handleLogin);
