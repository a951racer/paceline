/**
 * CalculatedRecognitionService - Business logic for data-driven recognitions
 * automatically computed from race/standings data within a season.
 *
 * Handles recognition definition, computation of "Most Improved" and "Biggest Mover"
 * recognitions, and wiring recalculation after standings updates.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.7, 17.8
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  CalculatedRecognitionModel,
  type CalculatedRecognitionDocument,
  EarnedRecognitionModel,
  type EarnedRecognitionDocument,
} from "@/models/calculated-recognition.model";
import { queryWithRetry } from "@/lib/db/timescaledb";
import type { CreateCalculatedRecognitionInput } from "@/lib/validations/calculated-recognition";

/** Default time period (in days) for computing recognitions if not configured */
const DEFAULT_TIME_PERIOD_DAYS = 30;

/** Result from a standings history query for a person */
interface StandingsSnapshot {
  personId: string;
  position: number;
  time: Date;
}

/** Callback hook for recognition recalculation after standings update */
let onStandingsUpdated: ((seasonId: string, leagueId: string) => void) | null = null;

/**
 * Set the callback for recognition recalculation after standings are updated.
 */
export function setOnStandingsUpdatedCallback(
  callback: ((seasonId: string, leagueId: string) => void) | null
): void {
  onStandingsUpdated = callback;
}

/**
 * Trigger the standings updated callback (called by StandingsService after recalculation).
 */
export function notifyStandingsUpdated(seasonId: string, leagueId: string): void {
  if (onStandingsUpdated) {
    onStandingsUpdated(seasonId, leagueId);
  }
}

export class CalculatedRecognitionService {
  /**
   * Define (create) a new calculated recognition with computation method and criteria.
   *
   * Requirement 17.1: Store with name, description, computation method, criteria, and badge
   * Requirement 17.8: Allow additional recognitions with configurable criteria
   */
  async define(
    data: CreateCalculatedRecognitionInput
  ): Promise<CalculatedRecognitionDocument> {
    await connectMongoDB();

    const recognition = await CalculatedRecognitionModel.create({
      name: data.name,
      description: data.description,
      computationMethod: data.computationMethod,
      criteria: data.criteria,
      badgeUrl: data.badgeUrl,
      isActive: data.isActive ?? true,
    });

    return recognition;
  }

  /**
   * Run all active recognitions for the given league-season.
   * For each active recognition, compute the winner and record it.
   *
   * Requirement 17.4: Recalculate all active recognitions when results are updated
   * Requirement 5.6: Computed recognitions scoped to league-season
   */
  async compute(seasonId: string, leagueId: string): Promise<EarnedRecognitionDocument[]> {
    await connectMongoDB();

    const activeRecognitions = await CalculatedRecognitionModel.find({
      isActive: true,
    });

    const results: EarnedRecognitionDocument[] = [];

    for (const recognition of activeRecognitions) {
      const timePeriodDays =
        recognition.criteria.timePeriodDays ?? DEFAULT_TIME_PERIOD_DAYS;

      let winner: { personId: string; computedValue: number } | null = null;

      if (recognition.computationMethod === "most_improved") {
        winner = await this.computeMostImproved(seasonId, timePeriodDays, leagueId);
      } else if (recognition.computationMethod === "biggest_mover") {
        winner = await this.computeBiggestMover(seasonId, timePeriodDays, leagueId);
      }
      // 'custom' computation method is a placeholder for future extensibility

      if (winner) {
        // Remove previous earned recognition for this recognition+season+league and upsert
        await EarnedRecognitionModel.deleteMany({
          recognitionId: recognition._id,
          seasonId,
          leagueId,
        });

        const earned = await EarnedRecognitionModel.create({
          recognitionId: recognition._id,
          personId: winner.personId,
          leagueId,
          seasonId,
          computedValue: winner.computedValue,
          earnedAt: new Date(),
        });

        results.push(earned);
      }
    }

    return results;
  }

  /**
   * Compute the "Most Improved" rider for a league-season.
   * "Most Improved" is the racer with the greatest improvement (decrease)
   * in standings position over the configured time period.
   *
   * Queries TimescaleDB standings_history for position changes.
   *
   * Requirement 17.2: Most Improved computes improvement in standings over time period
   * Requirement 5.6: Scoped to league-season
   */
  async getMostImproved(
    seasonId: string,
    period: number,
    leagueId?: string
  ): Promise<{ personId: string; computedValue: number } | null> {
    return this.computeMostImproved(seasonId, period, leagueId);
  }

  /**
   * Compute the "Biggest Mover" for a league-season.
   * "Biggest Mover" is the racer with the largest positive change in standings
   * within a single period (i.e., the biggest improvement between consecutive snapshots).
   *
   * Requirement 17.3: Biggest Mover identifies largest positive change in standings
   * Requirement 5.6: Scoped to league-season
   */
  async getBiggestMover(
    seasonId: string,
    period: number,
    leagueId?: string
  ): Promise<{ personId: string; computedValue: number } | null> {
    return this.computeBiggestMover(seasonId, period, leagueId);
  }

  /**
   * Internal computation for Most Improved.
   * Compares each person's earliest position to their latest position
   * within the time period. The person with the greatest position decrease
   * (i.e., moved from a higher number to a lower number = improved) wins.
   * When leagueId is provided, filters standings_history by league_id.
   */
  private async computeMostImproved(
    seasonId: string,
    timePeriodDays: number,
    leagueId?: string
  ): Promise<{ personId: string; computedValue: number } | null> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timePeriodDays);

    try {
      const leagueFilter = leagueId ? `AND league_id = $3` : '';
      const params: (string | number)[] = [seasonId, cutoffDate.toISOString()];
      if (leagueId) {
        params.push(leagueId);
      }

      // Get earliest and latest position for each person within the time window
      const result = await queryWithRetry<{
        person_id: string;
        earliest_position: number;
        latest_position: number;
        improvement: number;
      }>(
        `SELECT 
          person_id,
          first(position, time) AS earliest_position,
          last(position, time) AS latest_position,
          first(position, time) - last(position, time) AS improvement
        FROM standings_history
        WHERE season_id = $1
          AND time >= $2
          ${leagueFilter}
        GROUP BY person_id
        HAVING count(*) > 1
        ORDER BY improvement DESC
        LIMIT 1`,
        params
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      // improvement > 0 means position went down (improved)
      if (row.improvement <= 0) {
        return null;
      }

      return {
        personId: row.person_id,
        computedValue: row.improvement,
      };
    } catch (error) {
      console.error(
        "[CalculatedRecognitionService] Failed to compute most improved:",
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Internal computation for Biggest Mover.
   * Finds the largest positive change between any two consecutive standings snapshots
   * for a person within the time period. Uses TimescaleDB lag() to compare
   * consecutive positions.
   * When leagueId is provided, filters standings_history by league_id.
   */
  private async computeBiggestMover(
    seasonId: string,
    timePeriodDays: number,
    leagueId?: string
  ): Promise<{ personId: string; computedValue: number } | null> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timePeriodDays);

    try {
      const leagueFilter = leagueId ? `AND league_id = $3` : '';
      const params: (string | number)[] = [seasonId, cutoffDate.toISOString()];
      if (leagueId) {
        params.push(leagueId);
      }

      // Find the biggest single-period improvement (position decrease) for any person
      const result = await queryWithRetry<{
        person_id: string;
        biggest_move: number;
      }>(
        `WITH position_changes AS (
          SELECT
            person_id,
            position,
            lag(position) OVER (PARTITION BY person_id ORDER BY time) AS prev_position
          FROM standings_history
          WHERE season_id = $1
            AND time >= $2
            ${leagueFilter}
        )
        SELECT
          person_id,
          max(prev_position - position) AS biggest_move
        FROM position_changes
        WHERE prev_position IS NOT NULL
        GROUP BY person_id
        HAVING max(prev_position - position) > 0
        ORDER BY biggest_move DESC
        LIMIT 1`,
        params
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        personId: row.person_id,
        computedValue: row.biggest_move,
      };
    } catch (error) {
      console.error(
        "[CalculatedRecognitionService] Failed to compute biggest mover:",
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }
}

/**
 * Wire the CalculatedRecognitionService to be triggered after standings are updated.
 * This sets up the callback so that whenever standings are recalculated,
 * recognitions are also recomputed.
 *
 * Requirement 17.4: Recalculate recognitions when Race_Results are updated
 */
export function wireRecognitionRecalculation(): void {
  const recognitionService = new CalculatedRecognitionService();
  setOnStandingsUpdatedCallback((seasonId: string, leagueId: string) => {
    // Fire and forget - compute recognitions in the background
    recognitionService.compute(seasonId, leagueId).catch((error) => {
      console.error(
        "[CalculatedRecognitionService] Failed to compute recognitions:",
        error instanceof Error ? error.message : error
      );
    });
  });
}
