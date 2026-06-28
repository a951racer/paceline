/**
 * POST /api/auth/register
 * New user registration with email/password.
 * Creates a person with isRegistered: true and authProvider: 'local'.
 * @see Requirements 12.2
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PersonModel } from "@/models/person.model";
import { generateTokenPair, hashPassword } from "@/lib/auth";
import { withRateLimit } from "@/middleware/rate-limit";

const registerSchema = z.object({
  name: z.object({
    first: z.string().min(1, "First name is required"),
    last: z.string().min(1, "Last name is required"),
  }),
  email: z.string().email("Must be a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

async function handleRegister(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

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

    const { name, email, password } = parsed.data;

    await connectMongoDB();

    const existingPerson = await PersonModel.findOne({
      email: email.toLowerCase(),
    });

    if (existingPerson) {
      return NextResponse.json(
        {
          status: 409,
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const person = await PersonModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      authProvider: "local",
      isRegistered: true,
      roles: [],
      categoryHistory: [],
      organizationIds: [],
    });

    const tokenPair = generateTokenPair({
      userId: person._id.toString(),
      email: person.email,
      roles: person.roles,
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
      { status: 201 }
    );
  } catch (error) {
    console.error("[Auth Register] Error:", error);
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

export const POST = withRateLimit({ type: "public" })(handleRegister);
