/**
 * Service layer barrel exports.
 * Services encapsulate business logic and data access for the application.
 */

export { PersonService } from './person.service';
export type { CreatePersonData, UpdatePersonData, PersonListFilters } from './person.service';

export { OrganizationService } from './organization.service';
export type { CreateOrganizationData, UpdateOrganizationData } from './organization.service';

export { SeasonService } from './season.service';
export type { CreateSeasonData, UpdateSeasonData } from './season.service';

export { RaceService } from './race.service';
export type { CreateRaceData, UpdateRaceData } from './race.service';

export { RaceResultService, setOnResultsEnteredCallback, setOnAchievementCheckCallback } from './race-result.service';
export type { RaceResultEntry, EnterResultsResponse, ResultEntryError, ValidationResult } from './race-result.service';

export { CompetitionService } from './competition.service';
export type { CreateCompetitionData, UpdateCompetitionData, EligibilityRaceResult } from './competition.service';

export { StandingsService, wireStandingsRecalculation } from './standings.service';

export { AchievementService, wireAchievementCheck } from './achievement.service';

export { AwardService } from './award.service';
export type { SubmitNominationData } from './award.service';

export { CalculatedRecognitionService, wireRecognitionRecalculation } from './calculated-recognition.service';
export { setOnStandingsUpdatedCallback, notifyStandingsUpdated } from './calculated-recognition.service';

export { BrandingService } from './branding.service';
export type { UpdateBrandingData, UploadFile, LogoVariant } from './branding.service';

export { LeagueService } from './league.service';

export { EnrollmentService } from './enrollment.service';

export { LeagueAuthorizationService } from './league-authorization.service';

export { MigrationService } from './migration.service';
export type { MigrationResult, VerificationResult } from './migration.service';

export { ReferenceDataService } from './reference-data.service';
export type { CreateReferenceDataParams } from './reference-data.service';
