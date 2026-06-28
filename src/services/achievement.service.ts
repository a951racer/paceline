/**
 * AchievementService - Business logic for managing achievements and awarding them.
 * Handles achievement definition, threshold-based awarding (idempotent),
 * retrieval of earned achievements, and season reset.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  AchievementModel,
  type AchievementDocument,
  EarnedAchievementModel,
  type EarnedAchievementDocument,
} from "@/models/achievement.model";
import { RaceResultModel } from "@/models/race-result.model";
import { setOnAchievementCheckCallback } from "@/services/race-result.service";
import type { CreateAchievementInput } from "@/lib/validations/achievement";

export class AchievementService {
  /**
   * Define (create) a new achievement with trigger criteria and badge.
   *
   * Requirement 7.1: Store Achievement with name, description, trigger criteria, and badge
   */
  async define(data: CreateAchievementInput): Promise<AchievementDocument> {
    await connectMongoDB();

    const achievement = await AchievementModel.create({
      name: data.name,
      description: data.description,
      triggerCriteria: data.triggerCriteria,
      badgeUrl: data.badgeUrl,
    });

    return achievement;
  }

  /**
   * Evaluate achievement thresholds for a person in a season and award if met.
   * This is idempotent - the unique compound index on {achievementId, personId, seasonId}
   * prevents duplicate awards.
   *
   * Requirement 7.2: Award achievement when completed races meets threshold
   * Requirement 7.4: Prevent awarding same achievement more than once per person per season
   */
  async checkAndAward(
    personId: string,
    seasonId: string
  ): Promise<EarnedAchievementDocument[]> {
    await connectMongoDB();

    // Count completed races for this person in this season
    const racesCompleted = await RaceResultModel.countDocuments({
      racerId: personId,
      seasonId,
    });

    // Fetch all achievements
    const achievements = await AchievementModel.find();

    const awarded: EarnedAchievementDocument[] = [];

    for (const achievement of achievements) {
      // Only process races_completed trigger type
      if (achievement.triggerCriteria.type !== "races_completed") {
        continue;
      }

      // Check if threshold is met
      if (racesCompleted < achievement.triggerCriteria.threshold) {
        continue;
      }

      // Attempt to award - unique index handles duplicate prevention (idempotent)
      try {
        const earned = await EarnedAchievementModel.create({
          achievementId: achievement._id,
          personId,
          seasonId,
          earnedAt: new Date(),
          racesAtTime: racesCompleted,
        });
        awarded.push(earned);
      } catch (error: unknown) {
        // Catch MongoDB duplicate key error (code 11000) - achievement already earned
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code: number }).code === 11000
        ) {
          // Already awarded - this is expected (idempotent), skip silently
          continue;
        }
        // Re-throw unexpected errors
        throw error;
      }
    }

    return awarded;
  }

  /**
   * Get all earned achievements for a person (across all seasons).
   *
   * Requirement 7.3: Display earned achievements with badge
   * Requirement 7.5: Display Achievement Badge alongside the Achievement
   */
  async getByPerson(personId: string): Promise<EarnedAchievementDocument[]> {
    await connectMongoDB();

    const earned = await EarnedAchievementModel.find({ personId })
      .populate("achievementId")
      .sort({ earnedAt: -1 });

    return earned;
  }

  /**
   * Reset achievement progress for a new season by deleting earned achievements
   * for the specified season. This allows racers to re-earn achievements in the new season.
   *
   * Requirement 7.6: Reset Achievement progress at the start of each new Season
   */
  async resetForSeason(seasonId: string): Promise<number> {
    await connectMongoDB();

    const result = await EarnedAchievementModel.deleteMany({ seasonId });
    return result.deletedCount;
  }
}

/**
 * Wire the AchievementService into the RaceResultService callback
 * so achievements are checked automatically after race results are entered.
 *
 * This works alongside the existing standings recalculation callback.
 */
export function wireAchievementCheck(): void {
  const achievementService = new AchievementService();

  setOnAchievementCheckCallback((_raceId: string, seasonId: string) => {
    // Get all racers who had results entered for this race, then check achievements
    RaceResultModel.find({ raceId: _raceId, seasonId })
      .then((results) => {
        const uniqueRacerIds = [
          ...new Set(results.map((r) => r.racerId.toString())),
        ];
        return Promise.all(
          uniqueRacerIds.map((racerId) =>
            achievementService.checkAndAward(racerId, seasonId)
          )
        );
      })
      .catch((error) => {
        console.error(
          "[AchievementService] Failed to check achievements after result entry:",
          error instanceof Error ? error.message : error
        );
      });
  });
}
