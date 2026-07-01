import { z } from "zod";

/** Trigger criteria schema */
const triggerCriteriaSchema = z.object({
  type: z.literal("races_completed"),
  threshold: z.number().int().min(1, "Threshold must be at least 1"),
});

// --- Create Schema (POST) ---

export const createAchievementSchema = z.object({
  name: z.string().min(1, "Achievement name is required"),
  description: z.string().optional(),
  triggerCriteria: triggerCriteriaSchema,
  badgeUrl: z.string().url("Badge URL must be a valid URL").optional().or(z.literal("")),
  leagueId: z.string().min(1, "League ID is required"),
  seasonId: z.string().min(1, "Season ID is required"),
});

// --- Update Schema (PUT) ---

export const updateAchievementSchema = z.object({
  name: z.string().min(1, "Achievement name is required").optional(),
  description: z.string().optional(),
  triggerCriteria: triggerCriteriaSchema.optional(),
  badgeUrl: z.string().url("Badge URL must be a valid URL").optional().or(z.literal("")),
  leagueId: z.string().min(1).optional(),
  seasonId: z.string().min(1).optional(),
});

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;
