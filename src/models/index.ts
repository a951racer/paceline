/**
 * Database models barrel exports.
 * Mongoose schemas and model definitions for MongoDB collections.
 */

export { PersonModel } from "./person.model";
export type { PersonDocument } from "./person.model";

export { OrganizationModel } from "./organization.model";
export type { OrganizationDocument } from "./organization.model";

export { SeasonModel } from "./season.model";
export type { SeasonDocument } from "./season.model";

export { RaceModel } from "./race.model";
export type { RaceDocument, RaceLocationSubdoc } from "./race.model";

export { RaceResultModel } from "./race-result.model";
export type { RaceResultDocument } from "./race-result.model";

export { CompetitionModel } from "./competition.model";
export type {
  CompetitionDocument,
  EligibilityCriteriaSubdoc,
  ScoringMethodSubdoc,
} from "./competition.model";

export { StandingModel, TeamStandingModel } from "./standing.model";
export type {
  StandingDocument,
  StandingResultSubdoc,
  TeamStandingDocument,
  TeamMemberResultSubdoc,
} from "./standing.model";

export { AchievementModel, EarnedAchievementModel } from "./achievement.model";
export type {
  AchievementDocument,
  EarnedAchievementDocument,
} from "./achievement.model";

export {
  AwardModel,
  AssignedAwardModel,
  PeerNominationModel,
} from "./award.model";
export type {
  AwardDocument,
  AssignedAwardDocument,
  PeerNominationDocument,
} from "./award.model";

export {
  CalculatedRecognitionModel,
  EarnedRecognitionModel,
} from "./calculated-recognition.model";
export type {
  CalculatedRecognitionDocument,
  EarnedRecognitionDocument,
} from "./calculated-recognition.model";

export { BrandingConfigurationModel } from "./branding.model";
export type { BrandingConfigurationDocument } from "./branding.model";

export { LeagueModel } from "./league.model";
export type {
  LeagueDocument,
  LeagueBrandingSubdoc,
  LeagueBrandingLogosSubdoc,
} from "./league.model";

export { EnrollmentModel } from "./enrollment.model";
export type { EnrollmentDocument } from "./enrollment.model";

export { ReferenceDataModel } from "./reference-data.model";
export type { ReferenceDataDocument } from "./reference-data.model";
