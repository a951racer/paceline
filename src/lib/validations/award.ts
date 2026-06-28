import { z } from "zod";

/** Valid nomination types */
const nominationTypeValues = ["admin_assigned", "peer_nominated"] as const;

// --- Create Schema (POST) ---

export const createAwardSchema = z.object({
  name: z.string().min(1, "Award name is required"),
  description: z.string().min(1, "Description is required"),
  badgeUrl: z.string().url("Badge URL must be a valid URL"),
  nominationType: z.enum(nominationTypeValues),
});

// --- Update Schema (PUT) ---

export const updateAwardSchema = z.object({
  name: z.string().min(1, "Award name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  badgeUrl: z.string().url("Badge URL must be a valid URL").optional(),
  nominationType: z.enum(nominationTypeValues).optional(),
});

export type CreateAwardInput = z.infer<typeof createAwardSchema>;
export type UpdateAwardInput = z.infer<typeof updateAwardSchema>;
