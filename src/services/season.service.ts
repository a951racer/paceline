/**
 * SeasonService - Business logic for managing seasons in the league.
 * Handles CRUD operations, date range overlap validation, and single-active-season enforcement.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import { SeasonModel, type SeasonDocument } from "@/models/season.model";

/** Data for creating a new season */
export interface CreateSeasonData {
  name: string;
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
   * Create a new season with overlap validation.
   * Rejects creation if the date range overlaps with any existing season.
   *
   * Requirement 18.1: Create a Season with name, start date, and end date
   * Requirement 18.3: Reject creation if date range overlaps with existing season
   */
  async create(data: CreateSeasonData): Promise<SeasonDocument> {
    await connectMongoDB();

    if (data.endDate <= data.startDate) {
      throw new Error("End date must be after start date");
    }

    const isValid = await this.validateNoOverlap(data.startDate, data.endDate);
    if (!isValid) {
      throw new Error(
        "Season date range overlaps with an existing season. Please choose a non-overlapping date range."
      );
    }

    const season = await SeasonModel.create({
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive ?? false,
    });

    return season;
  }

  /**
   * Get the currently active season.
   * Returns null if no season is active.
   *
   * Requirement 18.2: Only one Season is active at any given time
   */
  async getActive(): Promise<SeasonDocument | null> {
    await connectMongoDB();

    const season = await SeasonModel.findOne({ isActive: true });
    return season;
  }

  /**
   * Validate that a date range does not overlap with any existing season.
   * Two date ranges [S1,E1] and [S2,E2] overlap if S1 <= E2 AND S2 <= E1.
   * Returns true if no overlap (valid), false if overlap exists.
   *
   * Requirement 18.3: Reject creation if date range overlaps
   */
  async validateNoOverlap(
    startDate: Date,
    endDate: Date,
    excludeSeasonId?: string
  ): Promise<boolean> {
    await connectMongoDB();

    const query: Record<string, unknown> = {
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
   *
   * Requirement 18.4: When a Season ends, mark inactive and preserve historical records
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
   * Activate a season, ensuring only one season is active at a time.
   * Deactivates all other seasons before activating the target.
   *
   * Requirement 18.2: Only one Season is active at any given time
   */
  async activate(seasonId: string): Promise<SeasonDocument> {
    await connectMongoDB();

    // Deactivate all other seasons first
    await SeasonModel.updateMany(
      { _id: { $ne: seasonId } },
      { $set: { isActive: false } }
    );

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
   * List all seasons, sorted by startDate descending (most recent first).
   */
  async list(): Promise<SeasonDocument[]> {
    await connectMongoDB();

    const seasons = await SeasonModel.find().sort({ startDate: -1 });
    return seasons;
  }
}
