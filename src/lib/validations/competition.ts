import { z } from "zod";

/** Valid scoring method types */
const scoringMethodTypeValues = [
  "points",
  "time",
  "position_average",
] as const;

/** Valid competition types */
const competitionTypeValues = ["individual", "team"] as const;

/** Valid categories */
const categoryValues = [
  "cat1",
  "cat2",
  "cat3",
  "cat4",
  "cat5",
  "beginner",
] as const;

/** Valid race types */
const raceTypeValues = [
  "crit",
  "time_trial",
  "road_race",
  "cyclocross",
  "gravel",
  "track",
] as const;

/** Scoring method schema */
const scoringMethodSchema = z.object({
  type: z.enum(scoringMethodTypeValues),
  pointsTable: z.record(z.string(), z.number()).optional(),
  countBestN: z.number().int().min(1).optional(),
});

/** Racer criteria schema */
const racerCriteriaSchema = z.object({
  categories: z.array(z.enum(categoryValues)).optional(),
  firstYearOnly: z.boolean().optional(),
  minRaces: z.number().int().min(0).optional(),
});

/** Race criteria schema */
const raceCriteriaSchema = z.object({
  raceTypes: z.array(z.enum(raceTypeValues)).optional(),
  specificRaceIds: z.array(z.string()).optional(),
});

/** Eligibility criteria schema */
const eligibilityCriteriaSchema = z.object({
  racerCriteria: racerCriteriaSchema.optional(),
  raceCriteria: raceCriteriaSchema.optional(),
});

// --- Create Schema (POST) ---

export const createCompetitionSchema = z.object({
  name: z.string().min(1, "Competition name is required"),
  description: z.string().optional(),
  leagueId: z.string().min(1, "League ID is required"),
  seasonId: z.string().min(1, "Season ID is required"),
  type: z.enum(competitionTypeValues),
  scoringMethod: scoringMethodSchema,
  eligibilityCriteria: eligibilityCriteriaSchema.default({}),
  isActive: z.boolean().default(true),
});

// --- Update Schema (PUT) ---

export const updateCompetitionSchema = z.object({
  name: z.string().min(1, "Competition name is required").optional(),
  description: z.string().optional(),
  seasonId: z.string().min(1, "Season ID is required").optional(),
  type: z.enum(competitionTypeValues).optional(),
  scoringMethod: scoringMethodSchema.optional(),
  eligibilityCriteria: eligibilityCriteriaSchema.optional(),
  isActive: z.boolean().optional(),
});

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;
