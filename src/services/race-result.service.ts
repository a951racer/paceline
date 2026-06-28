/**
 * RaceResultService - Business logic for managing race results.
 * Handles result entry with validation, duplicate rejection,
 * and triggers standings recalculation.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  RaceResultModel,
  type RaceResultDocument,
} from "@/models/race-result.model";
import { PersonModel } from "@/models/person.model";
import { RaceModel } from "@/models/race.model";
import type { Category } from "@/types";

/** Data for entering a single race result */
export interface RaceResultEntry {
  racerId: string;
  category: Category;
  position: number;
  finishTime: number;
  points?: number;
}

/** Result of entering a batch of results */
export interface EnterResultsResponse {
  successful: RaceResultDocument[];
  errors: ResultEntryError[];
}

/** Error detail for a failed result entry */
export interface ResultEntryError {
  racerId: string;
  reason: string;
}

/** Validation result for a single result entry */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Callback hook for standings recalculation.
 * Set this to trigger recalculation after result entry.
 * Will be wired to StandingsService in Task 7.2.
 */
export let onResultsEntered: ((raceId: string, seasonId: string) => void) | null = null;

/**
 * Set the callback for standings recalculation after results are entered.
 */
export function setOnResultsEnteredCallback(
  callback: ((raceId: string, seasonId: string) => void) | null
): void {
  onResultsEntered = callback;
}

/**
 * Callback hook for achievement checking after result entry.
 * Set via setOnAchievementCheckCallback().
 */
export let onAchievementCheck: ((raceId: string, seasonId: string) => void) | null = null;

/**
 * Set the callback for achievement checking after results are entered.
 */
export function setOnAchievementCheckCallback(
  callback: ((raceId: string, seasonId: string) => void) | null
): void {
  onAchievementCheck = callback;
}

export class RaceResultService {
  /**
   * Enter results for a race in batch.
   * For each result:
   * 1. Validates the racer exists (Req 5.2)
   * 2. Attempts insert; the unique compound index on {raceId, racerId}
   *    rejects duplicates (Req 5.4)
   * 3. Stores raceId, racerId, seasonId (from race), category, position, finishTime
   *
   * Returns successfully entered results and any errors.
   *
   * Requirement 5.1: Store Racer, Race, position, and finish time
   * Requirement 5.2: Reject entry for non-existent racer
   * Requirement 5.3: Trigger standings recalculation after entry
   * Requirement 5.4: Reject duplicate result for same racer and race
   */
  async enter(
    raceId: string,
    results: RaceResultEntry[]
  ): Promise<EnterResultsResponse> {
    await connectMongoDB();

    // Get the race to determine seasonId
    const race = await RaceModel.findById(raceId);
    if (!race) {
      throw new Error(`Race with id "${raceId}" not found`);
    }

    const seasonId = race.seasonId.toString();
    const successful: RaceResultDocument[] = [];
    const errors: ResultEntryError[] = [];

    for (const result of results) {
      // 1. Validate racer exists (Req 5.2)
      const racerExists = await PersonModel.exists({ _id: result.racerId });
      if (!racerExists) {
        errors.push({
          racerId: result.racerId,
          reason: `Racer with id "${result.racerId}" does not exist`,
        });
        continue;
      }

      // 2. Attempt to insert (unique index handles duplicate rejection)
      try {
        const raceResult = await RaceResultModel.create({
          raceId,
          racerId: result.racerId,
          seasonId,
          category: result.category,
          position: result.position,
          finishTime: result.finishTime,
          points: result.points,
        });
        successful.push(raceResult);
      } catch (error: unknown) {
        // Catch MongoDB duplicate key error (code 11000)
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code: number }).code === 11000
        ) {
          errors.push({
            racerId: result.racerId,
            reason: `Duplicate result: racer "${result.racerId}" already has a result in race "${raceId}"`,
          });
        } else {
          errors.push({
            racerId: result.racerId,
            reason:
              error instanceof Error
                ? error.message
                : "Unknown error during result entry",
          });
        }
      }
    }

    // 3. Trigger standings recalculation if any results were entered (Req 5.3)
    if (successful.length > 0 && onResultsEntered) {
      onResultsEntered(raceId, seasonId);
    }

    // 4. Trigger achievement check if any results were entered (Req 7.2)
    if (successful.length > 0 && onAchievementCheck) {
      onAchievementCheck(raceId, seasonId);
    }

    return { successful, errors };
  }

  /**
   * Validate a single result entry before insertion.
   * Checks that the racer exists and no duplicate exists for that race+racer.
   *
   * Requirement 5.2: Validate racer exists
   * Requirement 5.4: Check for duplicate
   */
  async validate(
    raceId: string,
    result: Pick<RaceResultEntry, "racerId">
  ): Promise<ValidationResult> {
    await connectMongoDB();

    // Check racer exists
    const racerExists = await PersonModel.exists({ _id: result.racerId });
    if (!racerExists) {
      return {
        valid: false,
        error: `Racer with id "${result.racerId}" does not exist`,
      };
    }

    // Check for duplicate
    const existingResult = await RaceResultModel.findOne({
      raceId,
      racerId: result.racerId,
    });
    if (existingResult) {
      return {
        valid: false,
        error: `Duplicate result: racer "${result.racerId}" already has a result in race "${raceId}"`,
      };
    }

    return { valid: true };
  }

  /**
   * Get all results for a race, sorted by position ascending.
   */
  async getByRace(raceId: string): Promise<RaceResultDocument[]> {
    await connectMongoDB();

    const results = await RaceResultModel.find({ raceId }).sort({
      position: 1,
    });
    return results;
  }

  /**
   * Get a racer's results in a season, sorted by race date (via population)
   * or by creation date as a fallback.
   */
  async getByRacer(
    personId: string,
    seasonId: string
  ): Promise<RaceResultDocument[]> {
    await connectMongoDB();

    const results = await RaceResultModel.find({
      racerId: personId,
      seasonId,
    }).sort({ createdAt: 1 });

    return results;
  }
}
