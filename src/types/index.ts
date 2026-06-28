/**
 * Shared TypeScript types and interfaces for the Bike Racing League application.
 * These types are used across the API layer, service layer, and presentation layer.
 */

// --- Enums and Literal Types ---

/** Roles a person can hold within the league */
export type Role =
  | "racer"
  | "volunteer"
  | "mentor"
  | "race_official"
  | "administrator";

/** Experience-based classification for racers */
export type Category =
  | "cat1"
  | "cat2"
  | "cat3"
  | "cat4"
  | "cat5"
  | "beginner";

/** Classification for the format of a race */
export type RaceType =
  | "crit"
  | "time_trial"
  | "road_race"
  | "cyclocross"
  | "gravel"
  | "track";

/** Organization classification */
export type OrganizationType = "team" | "promoter" | "sponsor" | "other";

/** Status of a race */
export type RaceStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Authentication provider */
export type AuthProvider = "local" | "google" | "apple";

/** Scoring method for competitions */
export type ScoringMethodType = "points" | "time" | "position_average";

/** Competition type */
export type CompetitionType = "individual" | "team";

/** Award nomination type */
export type NominationType = "admin_assigned" | "peer_nominated";

/** Peer nomination status */
export type NominationStatus = "pending" | "approved" | "rejected";

/** Calculated recognition computation method */
export type ComputationMethod = "most_improved" | "biggest_mover" | "custom";

// --- Interfaces ---

/** Category change history entry */
export interface CategoryChange {
  from: Category | null;
  to: Category;
  changedAt: Date;
  changedBy: string;
}

/** Person record */
export interface Person {
  _id: string;
  name: {
    first: string;
    last: string;
  };
  email: string;
  phone?: string;
  roles: Role[];
  category?: Category;
  categoryHistory: CategoryChange[];
  usaCyclingLicense?: string;
  organizationIds: string[];
  passwordHash?: string;
  authProvider?: AuthProvider;
  authProviderId?: string;
  isRegistered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Organization record */
export interface Organization {
  _id: string;
  name: string;
  type: OrganizationType;
  description?: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Season record */
export interface Season {
  _id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Race location subdocument */
export interface RaceLocation {
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

/** Race record */
export interface Race {
  _id: string;
  name: string;
  date: Date;
  location: RaceLocation;
  raceType: RaceType;
  categories: Category[];
  seasonId: string;
  competitionIds: string[];
  officialIds: string[];
  volunteerIds: string[];
  status: RaceStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Race result record */
export interface RaceResult {
  _id: string;
  raceId: string;
  racerId: string;
  seasonId: string;
  category: Category;
  position: number;
  finishTime: number;
  points?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Eligibility criteria for a competition */
export interface EligibilityCriteria {
  racerCriteria?: {
    categories?: Category[];
    firstYearOnly?: boolean;
    minRaces?: number;
  };
  raceCriteria?: {
    raceTypes?: RaceType[];
    specificRaceIds?: string[];
  };
}

/** Scoring method configuration */
export interface ScoringMethod {
  type: ScoringMethodType;
  pointsTable?: Record<number, number>;
  countBestN?: number;
}

/** Competition record */
export interface Competition {
  _id: string;
  name: string;
  description?: string;
  seasonId: string;
  type: CompetitionType;
  scoringMethod: ScoringMethod;
  eligibilityCriteria: EligibilityCriteria;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Standing result entry */
export interface StandingResult {
  raceId: string;
  position: number;
  points: number;
  finishTime: number;
}

/** Individual standing record */
export interface Standing {
  _id: string;
  competitionId: string;
  seasonId: string;
  racerId: string;
  category: Category;
  teamId?: string;
  totalPoints: number;
  totalRaces: number;
  position: number;
  results: StandingResult[];
  lastUpdated: Date;
}

/** Team member result entry */
export interface TeamMemberResult {
  racerId: string;
  raceId: string;
  points: number;
}

/** Team standing record */
export interface TeamStanding {
  _id: string;
  competitionId: string;
  seasonId: string;
  organizationId: string;
  totalPoints: number;
  totalRaces: number;
  position: number;
  memberResults: TeamMemberResult[];
  lastUpdated: Date;
}

/** Achievement definition */
export interface Achievement {
  _id: string;
  name: string;
  description: string;
  triggerCriteria: {
    type: "races_completed";
    threshold: number;
  };
  badgeUrl: string;
  createdAt: Date;
}

/** Earned achievement record */
export interface EarnedAchievement {
  _id: string;
  achievementId: string;
  personId: string;
  seasonId: string;
  earnedAt: Date;
  racesAtTime: number;
}

/** Award definition */
export interface Award {
  _id: string;
  name: string;
  description: string;
  badgeUrl: string;
  nominationType: NominationType;
  createdAt: Date;
}

/** Assigned award record */
export interface AssignedAward {
  _id: string;
  awardId: string;
  recipientId: string;
  seasonId: string;
  assignedAt: Date;
  source: NominationType;
  nominationId?: string;
}

/** Peer nomination record */
export interface PeerNomination {
  _id: string;
  nominatorId: string;
  nomineeId: string;
  awardId: string;
  seasonId: string;
  reason?: string;
  status: NominationStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

/** Calculated recognition definition */
export interface CalculatedRecognition {
  _id: string;
  name: string;
  description: string;
  computationMethod: ComputationMethod;
  criteria: {
    timePeriodDays?: number;
    customFormula?: string;
  };
  badgeUrl: string;
  isActive: boolean;
  createdAt: Date;
}

/** Earned recognition record */
export interface EarnedRecognition {
  _id: string;
  recognitionId: string;
  personId: string;
  seasonId: string;
  computedValue: number;
  earnedAt: Date;
}

/** Branding configuration */
export interface BrandingConfiguration {
  _id: string;
  leagueName: string;
  logos: {
    square: string;
    horizontal: string;
    vertical: string;
  };
  mainColors: [string, string, string];
  accentColors: [string] | [string, string];
  updatedAt: Date;
  updatedBy: string;
}

// --- API Types ---

/** Standard API error response */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Dashboard variant registry entry */
export interface DashboardVariant {
  role: Role | null;
  component: React.ComponentType;
  priority: number;
}
