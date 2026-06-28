import { z } from "zod";

/** Valid categories */
const categoryValues = [
  "cat1",
  "cat2",
  "cat3",
  "cat4",
  "cat5",
  "beginner",
] as const;

// --- Create Schema (POST) ---

export const createRaceResultSchema = z.object({
  raceId: z.string().min(1, "Race ID is required"),
  racerId: z.string().min(1, "Racer ID is required"),
  seasonId: z.string().min(1, "Season ID is required"),
  category: z.enum(categoryValues),
  position: z.number().int().min(1, "Position must be at least 1"),
  finishTime: z.number().min(0, "Finish time must be non-negative"),
  points: z.number().optional(),
});

// --- Update Schema (PUT) ---

export const updateRaceResultSchema = z.object({
  category: z.enum(categoryValues).optional(),
  position: z.number().int().min(1, "Position must be at least 1").optional(),
  finishTime: z.number().min(0, "Finish time must be non-negative").optional(),
  points: z.number().optional(),
});

export type CreateRaceResultInput = z.infer<typeof createRaceResultSchema>;
export type UpdateRaceResultInput = z.infer<typeof updateRaceResultSchema>;
