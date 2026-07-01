import { z } from "zod";

/** Valid nomination types */
const nominationTypeValues = ["admin_assigned", "peer_nominated"] as const;

// --- Create Schema (POST) ---

export const createAwardSchema = z.object({
  name: z.string().min(1, "Award name is required"),
  description: z.string().optional(),
  badgeUrl: z.string().url("Badge URL must be a valid URL").optional().or(z.literal("")),
  nominationType: z.enum(nominationTypeValues),
  leagueId: z.string().min(1, "League ID is required"),
  seasonId: z.string().min(1, "Season ID is required"),
});

// --- Update Schema (PUT) ---

export const updateAwardSchema = z.object({
  name: z.string().min(1, "Award name is required").optional(),
  description: z.string().optional(),
  badgeUrl: z.string().url("Badge URL must be a valid URL").optional().or(z.literal("")),
  nominationType: z.enum(nominationTypeValues).optional(),
  leagueId: z.string().min(1).optional(),
  seasonId: z.string().min(1).optional(),
});

export type CreateAwardInput = z.infer<typeof createAwardSchema>;
export type UpdateAwardInput = z.infer<typeof updateAwardSchema>;
