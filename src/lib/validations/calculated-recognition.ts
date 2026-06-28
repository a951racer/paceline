import { z } from "zod";

/** Valid computation methods */
const computationMethodValues = [
  "most_improved",
  "biggest_mover",
  "custom",
] as const;

/** Criteria schema */
const criteriaSchema = z.object({
  timePeriodDays: z.number().int().min(1).optional(),
  customFormula: z.string().optional(),
});

// --- Create Schema (POST) ---

export const createCalculatedRecognitionSchema = z.object({
  name: z.string().min(1, "Recognition name is required"),
  description: z.string().min(1, "Description is required"),
  computationMethod: z.enum(computationMethodValues),
  criteria: criteriaSchema.default({}),
  badgeUrl: z.string().url("Badge URL must be a valid URL"),
  isActive: z.boolean().default(true),
});

// --- Update Schema (PUT) ---

export const updateCalculatedRecognitionSchema = z.object({
  name: z.string().min(1, "Recognition name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  computationMethod: z.enum(computationMethodValues).optional(),
  criteria: criteriaSchema.optional(),
  badgeUrl: z.string().url("Badge URL must be a valid URL").optional(),
  isActive: z.boolean().optional(),
});

export type CreateCalculatedRecognitionInput = z.infer<
  typeof createCalculatedRecognitionSchema
>;
export type UpdateCalculatedRecognitionInput = z.infer<
  typeof updateCalculatedRecognitionSchema
>;
