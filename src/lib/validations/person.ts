import { z } from "zod";

/** Hardcoded security roles that drive permissions and feature access */
const securityRoleValues = [
  "administrator",
  "super_administrator",
  "league_administrator",
] as const;

/**
 * @deprecated Use `securityRoleValues` instead. Kept for backward compatibility during migration.
 */
const roleValues = [
  "racer",
  "volunteer",
  "mentor",
  "race_official",
  "administrator",
  "super_administrator",
  "league_administrator",
] as const;

/** Valid categories - now validated at runtime against league reference data */
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
  email: z.string().email("Must be a valid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  /** @deprecated Use `securityRoles` and `personTypes` instead */
  roles: z
    .array(z.enum(roleValues))
    .optional(),
  /** Hardcoded security roles validated at compile time */
  securityRoles: z
    .array(z.enum(securityRoleValues))
    .default([]),
  /** League-scoped person type reference data keys, validated at runtime */
  personTypes: z
    .array(z.string())
    .default([]),
  /** League associations */
  leagueIds: z
    .array(z.string())
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
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  /** @deprecated Use `securityRoles` and `personTypes` instead */
  roles: z.array(z.enum(roleValues)).optional(),
  /** Hardcoded security roles validated at compile time */
  securityRoles: z.array(z.enum(securityRoleValues)).optional(),
  /** League-scoped person type reference data keys, validated at runtime */
  personTypes: z.array(z.string()).optional(),
  /** League associations */
  leagueIds: z.array(z.string()).optional(),
  category: z.enum(categoryValues).optional(),
  usaCyclingLicense: z.string().optional(),
  organizationIds: z.array(z.string()).optional(),
  authProvider: z.enum(authProviderValues).optional(),
  authProviderId: z.string().optional(),
  isRegistered: z.boolean().optional(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
