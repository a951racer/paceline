import { z } from "zod";

/**
 * Race types and categories are now league-scoped reference data.
 * Validation is done as z.string().min(1) at the schema level,
 * with runtime validation against active reference data in the API layer.
 *
 * Default race types: crit, time_trial, road_race, cyclocross, gravel, track
 * Default categories: cat1, cat2, cat3, cat4, cat5, beginner
 */

/** Valid race statuses */
const raceStatusValues = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

/** Location subdocument schema */
const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().optional(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

// --- Create Schema (POST) ---

export const createRaceSchema = z.object({
  name: z.string().min(1, "Race name is required"),
  date: z.coerce.date(),
  location: locationSchema,
  raceType: z.string().min(1, "Race type is required"),
  leagueId: z.string().min(1, "League ID is required"),
  categories: z.array(z.string().min(1)).default([]),
  seasonId: z.string().min(1, "Season ID is required"),
  competitionIds: z.array(z.string()).default([]),
  officialIds: z.array(z.string()).default([]),
  volunteerIds: z.array(z.string()).default([]),
  status: z.enum(raceStatusValues).default("scheduled"),
});

// --- Update Schema (PUT) ---

export const updateRaceSchema = z.object({
  name: z.string().min(1, "Race name is required").optional(),
  date: z.coerce.date().optional(),
  location: locationSchema.optional(),
  raceType: z.string().min(1, "Race type is required").optional(),
  categories: z.array(z.string().min(1)).optional(),
  seasonId: z.string().min(1, "Season ID is required").optional(),
  competitionIds: z.array(z.string()).optional(),
  officialIds: z.array(z.string()).optional(),
  volunteerIds: z.array(z.string()).optional(),
  status: z.enum(raceStatusValues).optional(),
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
