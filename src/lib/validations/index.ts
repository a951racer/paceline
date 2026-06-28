/**
 * Barrel export for all Zod validation schemas.
 * Used in both API routes (server-side validation) and forms (client-side validation).
 */

export {
  createPersonSchema,
  updatePersonSchema,
  type CreatePersonInput,
  type UpdatePersonInput,
} from "./person";

export {
  createOrganizationSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from "./organization";

export {
  createSeasonSchema,
  updateSeasonSchema,
  type CreateSeasonInput,
  type UpdateSeasonInput,
} from "./season";

export {
  createRaceSchema,
  updateRaceSchema,
  type CreateRaceInput,
  type UpdateRaceInput,
} from "./race";

export {
  createRaceResultSchema,
  updateRaceResultSchema,
  type CreateRaceResultInput,
  type UpdateRaceResultInput,
} from "./race-result";

export {
  createCompetitionSchema,
  updateCompetitionSchema,
  type CreateCompetitionInput,
  type UpdateCompetitionInput,
} from "./competition";

export {
  createAchievementSchema,
  updateAchievementSchema,
  type CreateAchievementInput,
  type UpdateAchievementInput,
} from "./achievement";

export {
  createAwardSchema,
  updateAwardSchema,
  type CreateAwardInput,
  type UpdateAwardInput,
} from "./award";

export {
  createPeerNominationSchema,
  type CreatePeerNominationInput,
} from "./peer-nomination";

export {
  updateBrandingSchema,
  type UpdateBrandingInput,
} from "./branding";

export {
  createCalculatedRecognitionSchema,
  updateCalculatedRecognitionSchema,
  type CreateCalculatedRecognitionInput,
  type UpdateCalculatedRecognitionInput,
} from "./calculated-recognition";
