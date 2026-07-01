/**
 * RaceService - Business logic for managing races scoped to a league.
 * Handles CRUD operations, official/volunteer assignment, season association,
 * and upcoming race queries.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.1, 9.4, 5.8
 */

import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/db/mongodb";
import { RaceModel, type RaceDocument } from "@/models/race.model";
import { PersonModel } from "@/models/person.model";
import type { RaceStatus, RaceLocation } from "@/types";

/** Data for creating a new race */
export interface CreateRaceData {
  name: string;
  date: Date;
  location: RaceLocation;
  raceType: string;
  leagueId: string;
  categories?: string[];
  seasonId?: string;
  competitionIds?: string[];
  officialIds?: string[];
  volunteerIds?: string[];
  status?: RaceStatus;
}

/** Data for updating a race */
export interface UpdateRaceData {
  name?: string;
  date?: Date;
  location?: RaceLocation;
  raceType?: string;
  categories?: string[];
  seasonId?: string;
  competitionIds?: string[];
  status?: RaceStatus;
}

export class RaceService {
  constructor() {
    // SeasonService dependency removed; will be re-added in Task 5.2 with league-scoping
  }

  /**
   * Create a new race with season association, scoped to a league.
   * If no seasonId is provided, automatically associates with the season
   * whose date range contains the race date within the specified league.
   *
   * Requirement 4.1: Create a Race with name, date, location, Race_Type, and Season
   * Requirement 4.6: Associate a Race with a Season by date range or explicit assignment
   * Requirement 9.1: Race creation requires leagueId
   */
  async create(data: CreateRaceData): Promise<RaceDocument> {
    await connectMongoDB();

    let seasonId = data.seasonId;

    if (!seasonId) {
      // Auto-associate by finding which season's date range contains the race date within the league
      seasonId = await this.findSeasonByDate(data.date, data.leagueId);
    }

    const race = await RaceModel.create({
      name: data.name,
      date: data.date,
      location: data.location,
      raceType: data.raceType,
      leagueId: new mongoose.Types.ObjectId(data.leagueId),
      categories: data.categories ?? [],
      seasonId,
      competitionIds: data.competitionIds ?? [],
      officialIds: data.officialIds ?? [],
      volunteerIds: data.volunteerIds ?? [],
      status: data.status ?? "scheduled",
    });

    return race;
  }

  /**
   * Update race fields by ID.
   *
   * Requirement 4.1: Update race data
   */
  async update(
    id: string,
    data: UpdateRaceData
  ): Promise<RaceDocument> {
    await connectMongoDB();

    const race = await RaceModel.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: "after", runValidators: true }
    );

    if (!race) {
      throw new Error(`Race with id "${id}" not found`);
    }

    return race;
  }

  /**
   * Assign race officials to a race (replaces all existing officials).
   * Validates that all persons exist before assignment.
   *
   * Requirement 4.2: Associate Race_Officials with a Race
   */
  async assignOfficials(
    raceId: string,
    personIds: string[]
  ): Promise<RaceDocument> {
    await connectMongoDB();

    await this.validatePersonsExist(personIds);

    const race = await RaceModel.findByIdAndUpdate(
      raceId,
      { $set: { officialIds: personIds } },
      { returnDocument: "after" }
    );

    if (!race) {
      throw new Error(`Race with id "${raceId}" not found`);
    }

    return race;
  }

  /**
   * Assign volunteers to a race (replaces all existing volunteers).
   * Validates that all persons exist before assignment.
   *
   * Requirement 4.3: Associate Volunteers with a Race
   */
  async assignVolunteers(
    raceId: string,
    personIds: string[]
  ): Promise<RaceDocument> {
    await connectMongoDB();

    await this.validatePersonsExist(personIds);

    const race = await RaceModel.findByIdAndUpdate(
      raceId,
      { $set: { volunteerIds: personIds } },
      { returnDocument: "after" }
    );

    if (!race) {
      throw new Error(`Race with id "${raceId}" not found`);
    }

    return race;
  }

  /**
   * Get upcoming scheduled races (status 'scheduled', date >= today),
   * sorted by date ascending. Optionally filtered by leagueId.
   */
  async getUpcoming(leagueId?: string): Promise<RaceDocument[]> {
    await connectMongoDB();

    const now = new Date();

    const query: Record<string, unknown> = {
      status: "scheduled",
      date: { $gte: now },
    };

    if (leagueId) {
      query.leagueId = new mongoose.Types.ObjectId(leagueId);
    }

    const races = await RaceModel.find(query).sort({ date: 1 });

    return races;
  }

  /**
   * Fetch a race by its ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<RaceDocument | null> {
    await connectMongoDB();

    const race = await RaceModel.findById(id);
    return race;
  }

  /**
   * List all races for a specific league, sorted by date descending (most recent first).
   *
   * Requirement 9.4: Filter race listing by league context
   */
  async list(leagueId: string): Promise<RaceDocument[]> {
    await connectMongoDB();

    const races = await RaceModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
    }).sort({ date: -1 });
    return races;
  }

  /**
   * List all races across all leagues. For super admin use.
   */
  async listAll(): Promise<RaceDocument[]> {
    await connectMongoDB();
    return RaceModel.find({}).sort({ date: -1 });
  }

  /**
   * Find the season whose date range contains the given date within the specified league.
   * Throws if no matching season is found.
   *
   * Requirement 4.6: Associate a Race with a Season based on date range
   */
  private async findSeasonByDate(date: Date, leagueId: string): Promise<string> {
    const { SeasonModel } = await import("@/models/season.model");
    const seasons = await SeasonModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
    }).sort({ startDate: -1 });

    const matchingSeason = seasons.find(
      (season) => date >= season.startDate && date <= season.endDate
    );

    if (!matchingSeason) {
      throw new Error(
        `No season found containing the race date ${date.toISOString()}. Please create a season that covers this date or provide a seasonId explicitly.`
      );
    }

    return matchingSeason._id.toString();
  }

  /**
   * Validate that all provided person IDs exist in the database.
   * Throws if any person is not found.
   */
  private async validatePersonsExist(personIds: string[]): Promise<void> {
    if (personIds.length === 0) return;

    const existingCount = await PersonModel.countDocuments({
      _id: { $in: personIds },
    });

    if (existingCount !== personIds.length) {
      throw new Error(
        `One or more persons not found. Expected ${personIds.length} but found ${existingCount}.`
      );
    }
  }
}
