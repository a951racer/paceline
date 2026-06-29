import { z } from "zod";

// --- Create Schema (POST) ---

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  type: z.string().min(1, "Organization type is required"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
});

// --- Update Schema (PUT) ---

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").optional(),
  type: z.string().min(1, "Organization type is required").optional(),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
