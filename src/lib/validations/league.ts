import { z } from "zod";

/** Valid entity types for enrollment */
const entityTypeValues = ["person", "organization"] as const;

/** MongoDB ObjectId regex pattern (24-character hex string) */
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// --- League Create Schema (POST) ---

export const createLeagueSchema = z.object({
  name: z.string().min(2, "League name must be at least 2 characters"),
  description: z.string().optional(),
});

// --- League Update Schema (PUT) ---

export const updateLeagueSchema = z.object({
  name: z
    .string()
    .min(2, "League name must be at least 2 characters")
    .optional(),
  description: z.string().optional(),
});

// --- Enrollment Create Schema (POST) ---

export const createEnrollmentSchema = z.object({
  entityType: z.enum(entityTypeValues),
  entityId: z
    .string()
    .regex(objectIdRegex, "entityId must be a valid ObjectId"),
  leagueId: z
    .string()
    .regex(objectIdRegex, "leagueId must be a valid ObjectId"),
  seasonId: z
    .string()
    .regex(objectIdRegex, "seasonId must be a valid ObjectId"),
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
