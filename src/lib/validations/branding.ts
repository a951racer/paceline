import { z } from "zod";

/** Hex color pattern */
const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const hexColor = z.string().regex(hexColorRegex, "Must be a valid hex color (e.g., #FF5733 or #F57)");

/** Logos schema - all 3 variants required */
const logosSchema = z.object({
  square: z.string().url("Square logo must be a valid URL"),
  horizontal: z.string().url("Horizontal logo must be a valid URL"),
  vertical: z.string().url("Vertical logo must be a valid URL"),
});

// --- Create/Update Schema (PUT - branding is a singleton, so create and update are the same) ---

export const updateBrandingSchema = z.object({
  leagueName: z.string().min(1, "League name is required"),
  logos: logosSchema,
  mainColors: z.tuple([hexColor, hexColor, hexColor]),
  accentColors: z
    .array(hexColor)
    .min(1, "At least 1 accent color is required")
    .max(2, "At most 2 accent colors are allowed"),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
