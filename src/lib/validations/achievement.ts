import { z } from "zod";

/** Trigger criteria schema */
const triggerCriteriaSchema = z.object({
  type: z.literal("races_completed"),
  threshold: z.number().int().min(1, "Threshold must be at least 1"),
});

// --- Create Schema (POST) ---

export const createAchievementSchema = z.object({
  name: z.string().min(1, "Achievement name is required"),
  description: z.string().min(1, "Description is required"),
  triggerCriteria: triggerCriteriaSchema,
  badgeUrl: z.string().url("Badge URL must be a valid URL"),
});

// --- Update Schema (PUT) ---

export const updateAchievementSchema = z.object({
  name: z.string().min(1, "Achievement name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  triggerCriteria: triggerCriteriaSchema.optional(),
  badgeUrl: z.string().url("Badge URL must be a valid URL").optional(),
});

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;
