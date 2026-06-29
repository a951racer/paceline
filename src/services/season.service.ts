/**
 * SeasonService - Business logic for managing seasons scoped to a league.
 * Handles CRUD operations, date range overlap validation (scoped to league),
 * and single-active-season-per-league enforcement.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/db/mongodb";
import { SeasonModel, type SeasonDocument } from "@/models/season.model";

/** Data for creating a new season */
export interface CreateSeasonData {
  name: string;
  leagueId: string;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}

/** Data for updating a season */
export interface UpdateSeasonData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
}

export class SeasonService {
  /**
   * Create a new season with overlap validation scoped to the league.
   * Rejects creation if the date range overlaps with any existing season in the same league.
   * If isActive is true, validates no other active season exists in the league.
   *
   * Requirement 2.1: Create a Season with a parent League
   * Requirement 2.5: Reject creation if date range overlaps within same league
   * Requirement 2.4: Only one Season per League is active at any given time
   */
  async create(data: CreateSeasonData): Promise<SeasonDocument> {
    await connectMongoDB();

    if (data.endDate <= data.startDate) {
      throw new Error("End date must be after start date");
    }

    const isValid = await this.validateNoOverlap(
      data.leagueId,
      data.startDate,
      data.endDate
    );
    if (!isValid) {
      const error = new Error(
        "Season date range overlaps with an existing season in this league. Please choose a non-overlapping date range."
      );
      (error as Error & { code: string }).code = "SEASON_OVERLAP_IN_LEAGUE";
      throw error;
    }

    // If creating as active, check no other active season in this league
    if (data.isActive) {
      const existingActive = await SeasonModel.findOne({
        leagueId: new mongoose.Types.ObjectId(data.leagueId),
        isActive: true,
      });
      if (existingActive) {
        const error = new Error(
          "Cannot activate season; another season in this league is already active."
        );
        (error as Error & { code: string }).code = "ACTIVE_SEASON_EXISTS";
        throw error;
      }
    }

    const season = await SeasonModel.create({
      name: data.name,
      leagueId: new mongoose.Types.ObjectId(data.leagueId),
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive ?? false,
    });

    return season;
  }

  /**
   * Get the currently active season for a specific league.
   * Returns null if no season is active in that league.
   *
   * Requirement 2.4: Only one Season per League is active at any given time
   */
  async getActive(leagueId: string): Promise<SeasonDocument | null> {
    await connectMongoDB();

    const season = await SeasonModel.findOne({
      leagueId: new mongoose.Types.ObjectId(leagueId),
      isActive: true,
    });
    return season;
  }

  /**
   * Validate that a date range does not overlap with any existing season in the same league.
   * Two date ranges [S1,E1] and [S2,E2] overlap if S1 <= E2 AND S2 <= E1.
   * Returns true if no overlap (valid), false if overlap exists.
   *
   * Requirement 2.5: Reject creation if date range overlaps within same league
   * Requirement 2.6: Allow overlapping date ranges across different leagues
   */
  async validateNoOverlap(
    leagueId: string,
    startDate: Date,
    endDate: Date,
    excludeSeasonId?: string
  ): Promise<boolean> {
    await connectMongoDB();

    const query: Record<string, unknown> = {
      leagueId: new mongoose.Types.ObjectId(leagueId),
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };

    if (excludeSeasonId) {
      query._id = { $ne: excludeSeasonId };
    }

    const overlapping = await SeasonModel.findOne(query);
    return overlapping === null;
  }

  /**
   * Mark a season as inactive, preserving historical data.
   */
  async markInactive(seasonId: string): Promise<SeasonDocument> {
    await connectMongoDB();

    const season = await SeasonModel.findByIdAndUpdate(
      seasonId,
      { $set: { isActive: false } },
      { returnDocument: "after" }
    );

    if (!season) {
      throw new Error(`Season with id "${seasonId}" not found`);
    }

    return season;
  }

  /**
   * Activate a season, ensuring only one season per league is active at a time.
   * Only deactivates other seasons within the same league (not across leagues).
   *
   * Requirement 2.4: Only one Season per League is active at any given time
   */
  async activate(seasonId: string): Promise<SeasonDocument> {
    await connectMongoDB();

    // First, find the season to get its leagueId
    const targetSeason = await SeasonModel.findById(seasonId);
    if (!targetSeason) {
      throw new Error(`Season with id "${seasonId}" not found`);
    }

    // Check if another season in the same league is already active
    const existingActive = await SeasonModel.findOne({
      leagueId: targetSeason.leagueId,
      isActive: true,
      _id: { $ne: seasonId },
    });

    if (existingActive) {
      const error = new Error(
        "Cannot activate season; another season in this league is already active."
      );
      (error as Error & { code: string }).code = "ACTIVE_SEASON_EXISTS";
      throw error;
    }

    // Activate the target season
    const season = await SeasonModel.findByIdAndUpdate(
      seasonId,
      { $set: { isActive: true } },
      { returnDocument: "after" }
    );

    if (!season) {
      throw new Error(`Season with id "${seasonId}" not found`);
    }

    return season;
  }

  /**
   * Fetch a season by its ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<SeasonDocument | null> {
    await connectMongoDB();

    const season = await SeasonModel.findById(id);
    return season;
  }

  /**
   * List all seasons for a specific league, sorted by startDate descending (most recent first).
   *
   * Requirement 2.3: Allow multiple Seasons within a single League
   * Requirement 2.7: Display Seasons grouped by their parent League
   */
  async list(leagueId: string): Promise<SeasonDocument[]> {
    await connectMongoDB();

    const seasons = await SeasonModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
    }).sort({ startDate: -1 });
    return seasons;
  }
}
