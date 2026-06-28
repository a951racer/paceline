/**
 * Environment variable validation using Zod.
 * Validates required database connection strings and application settings.
 */

import { z } from "zod";

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // MongoDB
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (val) => val.startsWith("mongodb://") || val.startsWith("mongodb+srv://"),
      { message: "MONGODB_URI must be a valid MongoDB connection string" }
    ),

  // TimescaleDB (PostgreSQL)
  TIMESCALEDB_HOST: z.string().min(1, "TIMESCALEDB_HOST is required"),
  TIMESCALEDB_PORT: z.coerce.number().int().positive().default(5432),
  TIMESCALEDB_DATABASE: z
    .string()
    .min(1, "TIMESCALEDB_DATABASE is required"),
  TIMESCALEDB_USER: z.string().min(1, "TIMESCALEDB_USER is required"),
  TIMESCALEDB_PASSWORD: z.string().min(1, "TIMESCALEDB_PASSWORD is required"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (val) =>
        val.startsWith("postgresql://") || val.startsWith("postgres://"),
      { message: "DATABASE_URL must be a valid PostgreSQL connection string" }
    ),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns a typed configuration object.
 * Throws a descriptive error if any required variables are missing or invalid.
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`
    );
    throw new Error(
      `❌ Invalid environment variables:\n${errors.join("\n")}\n\nPlease check your .env.local file.`
    );
  }

  return result.data;
}

/**
 * Validated environment variables. Access this instead of `process.env` directly
 * to get type-safe, validated configuration values.
 */
export const env = validateEnv();
