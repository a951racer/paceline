import { z } from "zod";

/** Valid organization types */
const organizationTypeValues = [
  "team",
  "promoter",
  "sponsor",
  "other",
] as const;

// --- Create Schema (POST) ---

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  type: z.enum(organizationTypeValues),
  description: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
});

// --- Update Schema (PUT) ---

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").optional(),
  type: z.enum(organizationTypeValues).optional(),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
