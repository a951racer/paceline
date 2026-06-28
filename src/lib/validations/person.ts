import { z } from "zod";

/** Valid roles */
const roleValues = [
  "racer",
  "volunteer",
  "mentor",
  "race_official",
  "administrator",
] as const;

/** Valid categories */
const categoryValues = [
  "cat1",
  "cat2",
  "cat3",
  "cat4",
  "cat5",
  "beginner",
] as const;

/** Valid auth providers */
const authProviderValues = ["local", "google", "apple"] as const;

// --- Create Schema (POST) ---

export const createPersonSchema = z.object({
  name: z.object({
    first: z.string().min(1, "First name is required"),
    last: z.string().min(1, "Last name is required"),
  }),
  email: z.string().email("Must be a valid email address"),
  phone: z.string().optional(),
  roles: z
    .array(z.enum(roleValues))
    .default([]),
  category: z.enum(categoryValues).optional(),
  usaCyclingLicense: z.string().optional(),
  organizationIds: z.array(z.string()).default([]),
  authProvider: z.enum(authProviderValues).optional(),
  authProviderId: z.string().optional(),
  isRegistered: z.boolean().default(false),
});

// --- Update Schema (PUT) - all fields optional ---

export const updatePersonSchema = z.object({
  name: z
    .object({
      first: z.string().min(1, "First name is required"),
      last: z.string().min(1, "Last name is required"),
    })
    .optional(),
  email: z.string().email("Must be a valid email address").optional(),
  phone: z.string().optional(),
  roles: z.array(z.enum(roleValues)).optional(),
  category: z.enum(categoryValues).optional(),
  usaCyclingLicense: z.string().optional(),
  organizationIds: z.array(z.string()).optional(),
  authProvider: z.enum(authProviderValues).optional(),
  authProviderId: z.string().optional(),
  isRegistered: z.boolean().optional(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
