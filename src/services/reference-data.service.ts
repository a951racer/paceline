/**
 * ReferenceDataService - Business logic for managing league-scoped reference data.
 * Handles CRUD operations, deactivation/reactivation, key resolution, validation,
 * and default seeding for categories, race types, organization types, and person types.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.6, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  ReferenceDataModel,
  type ReferenceDataDocument,
} from "@/models/reference-data.model";
import { RaceModel } from "@/models/race.model";
import { PersonModel } from "@/models/person.model";
import { OrganizationModel } from "@/models/organization.model";
import { RaceResultModel } from "@/models/race-result.model";
import type {
  CreateReferenceDataInput,
  UpdateReferenceDataInput,
} from "@/lib/validations/reference-data";
import type { ReferenceDataType } from "@/types";

/** Input for creating a reference data item (includes leagueId) */
export interface CreateReferenceDataParams extends CreateReferenceDataInput {
  leagueId: string;
}

export class ReferenceDataService {
  /**
   * Create a new reference data item.
   * Enforces unique key per league+type combination.
   * Auto-assigns sortOrder if not provided.
   *
   * Requirements: 1.1, 1.2, 1.3, 1.6, 3.1, 4.1, 5.1, 6.1
   */
  async create(data: CreateReferenceDataParams): Promise<ReferenceDataDocument> {
    await connectMongoDB();

    // Auto-assign sortOrder if not provided
    const sortOrder =
      data.sortOrder ?? (await this.getNextSortOrder(data.leagueId, data.type));

    try {
      const item = await ReferenceDataModel.create({
        key: data.key,
        label: data.label,
        description: data.description,
        sortOrder,
        type: data.type,
        leagueId: data.leagueId,
        isActive: true,
      });

      return item;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: number }).code === 11000
      ) {
        const err = new Error(
          `A reference data item with key "${data.key}" already exists for this league and type`
        );
        (err as Error & { code: string; statusCode: number }).code =
          "REFERENCE_DATA_DUPLICATE_KEY";
        (err as Error & { code: string; statusCode: number }).statusCode = 409;
        throw err;
      }
      throw error;
    }
  }

  /**
   * Update a reference data item's label, description, sortOrder, or isActive.
   * Rejects any attempt to change the key field.
   *
   * Requirements: 3.2, 4.2, 5.2, 6.2
   */
  async update(
    id: string,
    data: UpdateReferenceDataInput
  ): Promise<ReferenceDataDocument> {
    await connectMongoDB();

    const item = await ReferenceDataModel.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: "after", runValidators: true }
    );

    if (!item) {
      const error = new Error(`Reference data item with id "${id}" not found`);
      (error as Error & { code: string; statusCode: number }).code =
        "REFERENCE_DATA_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    return item;
  }

  /**
   * Deactivate a reference data item (soft delete).
   * Sets isActive=false without modifying any referencing records.
   *
   * Requirements: 3.3, 4.3, 5.3, 6.3
   */
  async deactivate(id: string): Promise<ReferenceDataDocument> {
    await connectMongoDB();

    const item = await ReferenceDataModel.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { returnDocument: "after" }
    );

    if (!item) {
      const error = new Error(`Reference data item with id "${id}" not found`);
      (error as Error & { code: string; statusCode: number }).code =
        "REFERENCE_DATA_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    return item;
  }

  /**
   * Reactivate a previously deactivated reference data item.
   * Sets isActive=true.
   */
  async reactivate(id: string): Promise<ReferenceDataDocument> {
    await connectMongoDB();

    const item = await ReferenceDataModel.findByIdAndUpdate(
      id,
      { $set: { isActive: true } },
      { returnDocument: "after" }
    );

    if (!item) {
      const error = new Error(`Reference data item with id "${id}" not found`);
      (error as Error & { code: string; statusCode: number }).code =
        "REFERENCE_DATA_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    return item;
  }

  /**
   * Hard-delete a reference data item, but only if no existing records reference it.
   * Checks for references in races, people, organizations, and race_results
   * based on the item's type.
   *
   * Requirements: 8.4, 8.5
   */
  async delete(id: string): Promise<void> {
    await connectMongoDB();

    const item = await ReferenceDataModel.findById(id);

    if (!item) {
      const error = new Error(`Reference data item with id "${id}" not found`);
      (error as Error & { code: string; statusCode: number }).code =
        "REFERENCE_DATA_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    const referenceCount = await this.countReferences(item.type, item.key);

    if (referenceCount > 0) {
      const error = new Error(
        `Cannot delete reference data item "${item.key}" because it is referenced by ${referenceCount} existing record(s)`
      );
      (error as Error & { code: string; statusCode: number }).code =
        "REFERENCE_DATA_IN_USE";
      (error as Error & { code: string; statusCode: number }).statusCode = 409;
      throw error;
    }

    await ReferenceDataModel.findByIdAndDelete(id);
  }

  /**
   * Count how many records reference a given key based on the reference data type.
   * Used internally by delete() for referential integrity checks.
   */
  private async countReferences(
    type: ReferenceDataType,
    key: string
  ): Promise<number> {
    switch (type) {
      case "category": {
        const [racesCount, resultsCount, peopleCount] = await Promise.all([
          RaceModel.countDocuments({ categories: key } as Record<string, unknown>),
          RaceResultModel.countDocuments({ category: key } as Record<string, unknown>),
          PersonModel.countDocuments({ category: key } as Record<string, unknown>),
        ]);
        return racesCount + resultsCount + peopleCount;
      }
      case "race_type": {
        return RaceModel.countDocuments({ raceType: key } as Record<string, unknown>);
      }
      case "organization_type": {
        return OrganizationModel.countDocuments({ type: key } as Record<string, unknown>);
      }
      case "person_type": {
        return PersonModel.countDocuments({ personTypes: key } as Record<string, unknown>);
      }
      default:
        return 0;
    }
  }

  /**
   * List only active reference data items for a league and type.
   * Sorted by sortOrder ascending.
   *
   * Requirements: 3.5, 3.6, 4.5, 4.6, 5.5, 5.6, 6.5, 6.6
   */
  async listActive(
    leagueId: string,
    type: ReferenceDataType
  ): Promise<ReferenceDataDocument[]> {
    await connectMongoDB();

    return ReferenceDataModel.find({
      leagueId,
      type,
      isActive: true,
    }).sort({ sortOrder: 1 });
  }

  /**
   * List all reference data items (active and inactive) for a league and type.
   * Sorted by sortOrder ascending.
   */
  async listAll(
    leagueId: string,
    type: ReferenceDataType
  ): Promise<ReferenceDataDocument[]> {
    await connectMongoDB();

    return ReferenceDataModel.find({
      leagueId,
      type,
    }).sort({ sortOrder: 1 });
  }

  /**
   * Find a reference data item by its unique combination of leagueId, type, and key.
   */
  async getByKey(
    leagueId: string,
    type: ReferenceDataType,
    key: string
  ): Promise<ReferenceDataDocument | null> {
    await connectMongoDB();

    return ReferenceDataModel.findOne({ leagueId, type, key });
  }

  /**
   * Resolve a list of reference data keys to their display labels.
   * Returns a Map<key, label> for all matching items (active or inactive).
   * Unmatched keys map to the raw key string as a fallback.
   *
   * Requirements: 9.1, 9.2, 9.3, 9.4
   */
  async resolveKeys(
    leagueId: string,
    type: ReferenceDataType,
    keys: string[]
  ): Promise<Map<string, string>> {
    await connectMongoDB();

    const result = new Map<string, string>();

    if (keys.length === 0) {
      return result;
    }

    // Find all matching items (active or inactive) for the provided keys
    const items = await ReferenceDataModel.find({
      leagueId,
      type,
      key: { $in: keys },
    })
      .select("key label")
      .lean();

    // Build a lookup from the found items
    const foundLabels = new Map<string, string>();
    for (const item of items) {
      foundLabels.set(item.key, item.label);
    }

    // For each requested key, use the label if found, otherwise fall back to raw key
    for (const key of keys) {
      result.set(key, foundLabels.get(key) ?? key);
    }

    return result;
  }

  /**
   * Validate that all provided keys exist as active reference data items
   * for the given league and type.
   * Returns true if all keys are valid (exist and are active), false otherwise.
   *
   * Requirement: 9.5
   */
  async validateKeys(
    leagueId: string,
    type: ReferenceDataType,
    keys: string[]
  ): Promise<boolean> {
    await connectMongoDB();

    if (keys.length === 0) {
      return true;
    }

    // Count how many of the provided keys exist as active items
    const activeCount = await ReferenceDataModel.countDocuments({
      leagueId,
      type,
      key: { $in: keys },
      isActive: true,
    });

    // All keys must match an active item
    return activeCount === new Set(keys).size;
  }

  /**
   * Seed default reference data for a newly created league.
   * Creates default items for all four types (category, race_type, organization_type, person_type)
   * with proper labels and sort orders from the design specification.
   * Idempotent: skips creation if items already exist for a given league+type.
   *
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
   */
  async seedDefaults(leagueId: string): Promise<void> {
    await connectMongoDB();

    const defaults: {
      type: ReferenceDataType;
      items: { key: string; label: string; sortOrder: number }[];
    }[] = [
      {
        type: "category",
        items: [
          { key: "cat1", label: "Category 1", sortOrder: 1 },
          { key: "cat2", label: "Category 2", sortOrder: 2 },
          { key: "cat3", label: "Category 3", sortOrder: 3 },
          { key: "cat4", label: "Category 4", sortOrder: 4 },
          { key: "cat5", label: "Category 5", sortOrder: 5 },
          { key: "beginner", label: "Beginner", sortOrder: 6 },
        ],
      },
      {
        type: "race_type",
        items: [
          { key: "crit", label: "Criterium", sortOrder: 1 },
          { key: "time_trial", label: "Time Trial", sortOrder: 2 },
          { key: "road_race", label: "Road Race", sortOrder: 3 },
          { key: "cyclocross", label: "Cyclocross", sortOrder: 4 },
          { key: "gravel", label: "Gravel", sortOrder: 5 },
          { key: "track", label: "Track", sortOrder: 6 },
        ],
      },
      {
        type: "organization_type",
        items: [
          { key: "team", label: "Team", sortOrder: 1 },
          { key: "promoter", label: "Promoter", sortOrder: 2 },
          { key: "sponsor", label: "Sponsor", sortOrder: 3 },
          { key: "other", label: "Other", sortOrder: 4 },
        ],
      },
      {
        type: "person_type",
        items: [
          { key: "racer", label: "Racer", sortOrder: 1 },
          { key: "volunteer", label: "Volunteer", sortOrder: 2 },
          { key: "mentor", label: "Mentor", sortOrder: 3 },
          { key: "race_official", label: "Race Official", sortOrder: 4 },
        ],
      },
    ];

    for (const { type, items } of defaults) {
      // Check if items already exist for this league+type (idempotent)
      const existingCount = await ReferenceDataModel.countDocuments({
        leagueId,
        type,
      });

      if (existingCount > 0) {
        continue;
      }

      // Bulk insert all default items for this type
      const documents = items.map((item) => ({
        key: item.key,
        label: item.label,
        sortOrder: item.sortOrder,
        type,
        leagueId,
        isActive: true,
      }));

      await ReferenceDataModel.insertMany(documents);
    }
  }

  /**
   * Get the next sortOrder value for a given league and type.
   * Returns max(sortOrder) + 1, or 1 if no items exist.
   *
   * Requirement: 1.6
   */
  async getNextSortOrder(
    leagueId: string,
    type: ReferenceDataType
  ): Promise<number> {
    await connectMongoDB();

    const lastItem = await ReferenceDataModel.findOne({ leagueId, type })
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();

    return lastItem ? lastItem.sortOrder + 1 : 1;
  }
}
