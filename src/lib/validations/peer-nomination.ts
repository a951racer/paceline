import { z } from "zod";

// --- Create Schema (POST) ---

export const createPeerNominationSchema = z
  .object({
    nominatorId: z.string().min(1, "Nominator ID is required"),
    nomineeId: z.string().min(1, "Nominee ID is required"),
    awardId: z.string().min(1, "Award ID is required"),
    seasonId: z.string().min(1, "Season ID is required"),
    reason: z.string().optional(),
  })
  .refine((data) => data.nominatorId !== data.nomineeId, {
    message: "A person cannot nominate themselves",
    path: ["nomineeId"],
  });

export type CreatePeerNominationInput = z.infer<
  typeof createPeerNominationSchema
>;
