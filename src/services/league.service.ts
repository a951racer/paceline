/**
 * LeagueService - Business logic for managing leagues in the multi-league platform.
 * Handles CRUD operations, unique name enforcement (case-insensitive), and default branding initialization.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import { LeagueModel, type LeagueDocument } from "@/models/league.model";
import type { CreateLeagueInput, UpdateLeagueInput } from "@/lib/validations/league";
import { ReferenceDataService } from "@/services/reference-data.service";

/** Default branding configuration applied to newly created leagues */
const DEFAULT_BRANDING = {
  leagueName: "",
  logos: {
    square: "/images/default-logo-square.png",
    horizontal: "/images/default-logo-horizontal.png",
    vertical: "/images/default-logo-vertical.png",
  },
  mainColors: ["#000000", "#ffffff", "#333333"] as [string, string, string],
  accentColors: ["#b87333"],
};

export class LeagueService {
  /**
   * Create a new league with unique name enforcement (case-insensitive)
   * and default branding initialization.
   *
   * Requirement 1.1: Store the League with a unique name, optional description, and creation timestamp
   * Requirement 1.3: Enforce uniqueness on League names across the entire application
   * Requirement 1.6: Reject creation and notify if duplicate name exists
   * Requirement 11.5: Initialize with default BrandingConfiguration
   */
  async create(data: CreateLeagueInput): Promise<LeagueDocument> {
    await connectMongoDB();

    // Check for existing league with same name (case-insensitive)
    const existing = await LeagueModel.findOne({ name: data.name }).collation({
      locale: "en",
      strength: 2,
    });

    if (existing) {
      const error = new Error(
        `A league with the name "${data.name}" already exists`
      );
      (error as Error & { code: string; statusCode: number }).code =
        "LEAGUE_DUPLICATE_NAME";
      (error as Error & { code: string; statusCode: number }).statusCode = 409;
      throw error;
    }

    const league = await LeagueModel.create({
      name: data.name,
      description: data.description,
      isActive: true,
      branding: {
        ...DEFAULT_BRANDING,
        leagueName: data.name,
      },
    });

    // Seed default reference data for the new league
    try {
      const referenceDataService = new ReferenceDataService();
      await referenceDataService.seedDefaults(league._id.toString());
    } catch (error) {
      console.warn(
        `[LeagueService] Failed to seed default reference data for league "${league.name}" (${league._id}):`,
        error instanceof Error ? error.message : error
      );
    }

    return league;
  }

  /**
   * Update a league's name and/or description, preserving all associations.
   *
   * Requirement 1.2: Persist updated name and description while preserving associated Seasons and Enrollments
   * Requirement 1.3: Enforce uniqueness on League names (if name changes)
   */
  async update(id: string, data: UpdateLeagueInput): Promise<LeagueDocument> {
    await connectMongoDB();

    // If name is being updated, check for uniqueness (case-insensitive)
    if (data.name) {
      const existing = await LeagueModel.findOne({ name: data.name })
        .collation({ locale: "en", strength: 2 });

      if (existing && existing._id.toString() !== id) {
        const error = new Error(
          `A league with the name "${data.name}" already exists`
        );
        (error as Error & { code: string; statusCode: number }).code =
          "LEAGUE_DUPLICATE_NAME";
        (error as Error & { code: string; statusCode: number }).statusCode = 409;
        throw error;
      }
    }

    const updateFields: Record<string, unknown> = {};
    if (data.name !== undefined) {
      updateFields.name = data.name;
      updateFields["branding.leagueName"] = data.name;
    }
    if (data.description !== undefined) {
      updateFields.description = data.description;
    }

    const league = await LeagueModel.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { returnDocument: "after", runValidators: true }
    );

    if (!league) {
      const error = new Error(`League with id "${id}" not found`);
      (error as Error & { code: string; statusCode: number }).code =
        "LEAGUE_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    return league;
  }

  /**
   * Deactivate a league, preserving all historical data.
   *
   * Requirement 1.5: Mark the League as inactive and preserve all historical data
   */
  async deactivate(id: string): Promise<LeagueDocument> {
    await connectMongoDB();

    const league = await LeagueModel.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { returnDocument: "after" }
    );

    if (!league) {
      const error = new Error(`League with id "${id}" not found`);
      (error as Error & { code: string; statusCode: number }).code =
        "LEAGUE_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    return league;
  }

  /**
   * Fetch a league by its ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<LeagueDocument | null> {
    await connectMongoDB();

    const league = await LeagueModel.findById(id);
    return league;
  }

  /**
   * Fetch a league by its name (case-insensitive).
   * Returns null if not found.
   *
   * Requirement 1.3: Case-insensitive name matching
   */
  async getByName(name: string): Promise<LeagueDocument | null> {
    await connectMongoDB();

    const league = await LeagueModel.findOne({ name }).collation({
      locale: "en",
      strength: 2,
    });
    return league;
  }

  /**
   * List all leagues (active and inactive).
   * Used by Super_Admin to manage all leagues.
   *
   * Requirement 1.4: Allow multiple Leagues to exist simultaneously
   */
  async listAll(): Promise<LeagueDocument[]> {
    await connectMongoDB();

    const leagues = await LeagueModel.find().sort({ createdAt: -1 });
    return leagues;
  }

  /**
   * List only active leagues.
   * Used for public league selectors.
   *
   * Requirement 1.4: Allow multiple Leagues to exist simultaneously
   */
  async listActive(): Promise<LeagueDocument[]> {
    await connectMongoDB();

    const leagues = await LeagueModel.find({ isActive: true }).sort({
      name: 1,
    });
    return leagues;
  }
}
