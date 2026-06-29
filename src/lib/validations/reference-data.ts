import { z } from "zod";

/** Valid reference data types */
const referenceDataTypeValues = [
  "category",
  "race_type",
  "organization_type",
  "person_type",
] as const;

/** Key pattern: lowercase alphanumeric and underscores only */
const keyRegex = /^[a-z0-9_]+$/;

// --- Create Schema (POST) ---

export const createReferenceDataSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(30, "Key must be at most 30 characters")
    .regex(
      keyRegex,
      "Key must contain only lowercase letters, numbers, and underscores"
    ),
  label: z
    .string()
    .min(1, "Label is required")
    .max(100, "Label must be at most 100 characters"),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  type: z.enum(referenceDataTypeValues),
});

// --- Update Schema (PUT) ---

export const updateReferenceDataSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(100, "Label must be at most 100 characters")
    .optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type CreateReferenceDataInput = z.infer<
  typeof createReferenceDataSchema
>;
export type UpdateReferenceDataInput = z.infer<
  typeof updateReferenceDataSchema
>;
