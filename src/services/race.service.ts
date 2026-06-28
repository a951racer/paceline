/**
 * RaceService - Business logic for managing races in the league.
 * Handles CRUD operations, official/volunteer assignment, season association,
 * and upcoming race queries.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import { RaceModel, type RaceDocument } from "@/models/race.model";
import { PersonModel } from "@/models/person.model";
import { SeasonService } from "@/services/season.service";
import type { RaceType, Category, RaceStatus, RaceLocation } from "@/types";

/** Valid race types for validation */
const VALID_RACE_TYPES: RaceType[] = [
  "crit",
  "time_trial",
  "road_race",
  "cyclocross",
  "gravel",
  "track",
];

/** Data for creating a new race */
export interface CreateRaceData {
  name: string;
  date: Date;
  location: RaceLocation;
  raceType: RaceType;
  categories?: Category[];
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
  raceType?: RaceType;
  categories?: Category[];
  seasonId?: string;
  competitionIds?: string[];
  status?: RaceStatus;
}

export class RaceService {
  private seasonService: SeasonService;

  constructor() {
    this.seasonService = new SeasonService();
  }

  /**
   * Create a new race with season association.
   * If no seasonId is provided, automatically associates with the season
   * whose date range contains the race date.
   *
   * Requirement 4.1: Create a Race with name, date, location, Race_Type, and Season
   * Requirement 4.6: Associate a Race with a Season by date range or explicit assignment
   */
  async create(data: CreateRaceData): Promise<RaceDocument> {
    await connectMongoDB();

    this.validateRaceType(data.raceType);

    let seasonId = data.seasonId;

    if (!seasonId) {
      // Auto-associate by finding which season's date range contains the race date
      seasonId = await this.findSeasonByDate(data.date);
    }

    const race = await RaceModel.create({
      name: data.name,
      date: data.date,
      location: data.location,
      raceType: data.raceType,
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

    if (data.raceType) {
      this.validateRaceType(data.raceType);
    }

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
   * sorted by date ascending.
   */
  async getUpcoming(): Promise<RaceDocument[]> {
    await connectMongoDB();

    const now = new Date();

    const races = await RaceModel.find({
      status: "scheduled",
      date: { $gte: now },
    }).sort({ date: 1 });

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
   * List all races, sorted by date descending (most recent first).
   */
  async list(): Promise<RaceDocument[]> {
    await connectMongoDB();

    const races = await RaceModel.find().sort({ date: -1 });
    return races;
  }

  /**
   * Find the season whose date range contains the given date.
   * Throws if no matching season is found.
   *
   * Requirement 4.6: Associate a Race with a Season based on date range
   */
  private async findSeasonByDate(date: Date): Promise<string> {
    const seasons = await this.seasonService.list();

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
   * Validate that the provided raceType is a valid enum value.
   *
   * Requirement 4.4: Support predefined Race_Types
   */
  private validateRaceType(raceType: RaceType): void {
    if (!VALID_RACE_TYPES.includes(raceType)) {
      throw new Error(
        `Invalid race type "${raceType}". Valid types are: ${VALID_RACE_TYPES.join(", ")}`
      );
    }
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
