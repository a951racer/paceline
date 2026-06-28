/**
 * CompetitionService - Business logic for managing competitions in the league.
 * Handles CRUD operations and eligibility evaluation for race results against competitions.
 *
 * Requirements: 6.12, 6.13, 6.14, 6.15, 6.16
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  CompetitionModel,
  type CompetitionDocument,
} from "@/models/competition.model";
import type {
  CompetitionType,
  ScoringMethod,
  EligibilityCriteria,
  Category,
  RaceType,
} from "@/types";

/** Data for creating a new competition */
export interface CreateCompetitionData {
  name: string;
  description?: string;
  seasonId: string;
  type: CompetitionType;
  scoringMethod: ScoringMethod;
  eligibilityCriteria?: EligibilityCriteria;
  isActive?: boolean;
}

/** Data for updating a competition */
export interface UpdateCompetitionData {
  name?: string;
  description?: string;
  type?: CompetitionType;
  scoringMethod?: ScoringMethod;
  eligibilityCriteria?: EligibilityCriteria;
  isActive?: boolean;
}

/** Minimal race result shape needed for eligibility evaluation */
export interface EligibilityRaceResult {
  category: Category;
  raceType: RaceType;
  raceId: string;
}

export class CompetitionService {
  /**
   * Create a new competition with scoring method and eligibility criteria.
   *
   * Requirement 6.14: Store optional Eligibility_Criteria that filter which Racers or Races qualify
   * Requirement 6.12: Support multiple parallel Competitions simultaneously
   */
  async create(data: CreateCompetitionData): Promise<CompetitionDocument> {
    await connectMongoDB();

    const competition = await CompetitionModel.create({
      name: data.name,
      description: data.description,
      seasonId: data.seasonId,
      type: data.type,
      scoringMethod: data.scoringMethod,
      eligibilityCriteria: (data.eligibilityCriteria ?? {}) as Record<string, unknown>,
      isActive: data.isActive ?? true,
    });

    return competition;
  }

  /**
   * Evaluate whether a race result qualifies for a competition based on eligibility criteria.
   *
   * Requirement 6.13: Evaluate Race_Result against all active Competitions and include it
   *   in Standings of each Competition whose Eligibility_Criteria the Race_Result satisfies
   * Requirement 6.15: Apply Eligibility_Criteria to include only qualifying Racers
   * Requirement 6.16: Apply Eligibility_Criteria to include only qualifying Races
   *
   * Rules:
   * - racerCriteria.categories: racer's category must be in the list (if specified)
   * - racerCriteria.firstYearOnly: if true, only include first-year racers (accept all for now)
   * - racerCriteria.minRaces: not checked at eligibility time (threshold for standings)
   * - raceCriteria.raceTypes: the race's raceType must be in the list (if specified)
   * - raceCriteria.specificRaceIds: the race's ID must be in the list (if specified)
   * - If no criteria set for a category, it's considered eligible (open to all)
   */
  evaluateEligibility(
    raceResult: EligibilityRaceResult,
    competition: CompetitionDocument
  ): boolean {
    const criteria = competition.eligibilityCriteria;

    // If no criteria defined at all, the competition is open to all
    if (!criteria) {
      return true;
    }

    // Check racer criteria
    if (criteria.racerCriteria) {
      const { categories, firstYearOnly } = criteria.racerCriteria;

      // Check category filter
      if (categories && categories.length > 0) {
        if (!categories.includes(raceResult.category)) {
          return false;
        }
      }

      // firstYearOnly: accept all for now since we don't track first-year status
      // minRaces: not checked at eligibility time (it's for standings threshold)
    }

    // Check race criteria
    if (criteria.raceCriteria) {
      const { raceTypes, specificRaceIds } = criteria.raceCriteria;

      // Check race type filter
      if (raceTypes && raceTypes.length > 0) {
        if (!raceTypes.includes(raceResult.raceType)) {
          return false;
        }
      }

      // Check specific race IDs filter
      if (specificRaceIds && specificRaceIds.length > 0) {
        const raceIdStrings = specificRaceIds.map((id) => id.toString());
        if (!raceIdStrings.includes(raceResult.raceId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get all active competitions.
   *
   * Requirement 6.12: Support multiple parallel Competitions simultaneously
   */
  async getActive(): Promise<CompetitionDocument[]> {
    await connectMongoDB();

    const competitions = await CompetitionModel.find({ isActive: true });
    return competitions;
  }

  /**
   * Fetch a competition by its ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<CompetitionDocument | null> {
    await connectMongoDB();

    const competition = await CompetitionModel.findById(id);
    return competition;
  }

  /**
   * List all competitions, optionally filtered by seasonId.
   * Sorted by name ascending.
   */
  async list(seasonId?: string): Promise<CompetitionDocument[]> {
    await connectMongoDB();

    const query: Record<string, unknown> = {};
    if (seasonId) {
      query.seasonId = seasonId;
    }

    const competitions = await CompetitionModel.find(query).sort({ name: 1 });
    return competitions;
  }

  /**
   * Update an existing competition.
   * Returns the updated document or throws if not found.
   */
  async update(
    id: string,
    data: UpdateCompetitionData
  ): Promise<CompetitionDocument> {
    await connectMongoDB();

    const competition = await CompetitionModel.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: "after", runValidators: true }
    );

    if (!competition) {
      throw new Error(`Competition with id "${id}" not found`);
    }

    return competition;
  }
}
