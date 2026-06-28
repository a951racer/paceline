import { z } from "zod";

/** Valid race types */
const raceTypeValues = [
  "crit",
  "time_trial",
  "road_race",
  "cyclocross",
  "gravel",
  "track",
] as const;

/** Valid categories */
const categoryValues = [
  "cat1",
  "cat2",
  "cat3",
  "cat4",
  "cat5",
  "beginner",
] as const;

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
  raceType: z.enum(raceTypeValues),
  categories: z.array(z.enum(categoryValues)).default([]),
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
  raceType: z.enum(raceTypeValues).optional(),
  categories: z.array(z.enum(categoryValues)).optional(),
  seasonId: z.string().min(1, "Season ID is required").optional(),
  competitionIds: z.array(z.string()).optional(),
  officialIds: z.array(z.string()).optional(),
  volunteerIds: z.array(z.string()).optional(),
  status: z.enum(raceStatusValues).optional(),
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
