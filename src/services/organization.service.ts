/**
 * OrganizationService - Business logic for managing organizations in the league.
 * Handles CRUD operations, member management, and team listing.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  OrganizationModel,
  type OrganizationDocument,
} from "@/models/organization.model";
import { PersonModel } from "@/models/person.model";
import type { OrganizationType } from "@/types";
import mongoose from "mongoose";

/** Valid organization types */
const VALID_TYPES: OrganizationType[] = ["team", "promoter", "sponsor", "other"];

/** Data for creating a new organization */
export interface CreateOrganizationData {
  name: string;
  type: OrganizationType;
  description?: string;
  memberIds?: string[];
  leagueIds?: string[];
}

/** Data for updating an organization */
export interface UpdateOrganizationData {
  name?: string;
  type?: OrganizationType;
  description?: string;
  leagueIds?: string[];
}

export class OrganizationService {
  /**
   * Create a new organization with a unique name and type.
   * Validates type and catches duplicate name errors.
   *
   * Requirement 2.1: Create an Organization with a unique name and a type
   */
  async create(data: CreateOrganizationData): Promise<OrganizationDocument> {
    await connectMongoDB();

    if (!VALID_TYPES.includes(data.type)) {
      throw new Error(
        `Invalid organization type "${data.type}". Valid types are: ${VALID_TYPES.join(", ")}`
      );
    }

    try {
      const organization = await OrganizationModel.create({
        name: data.name,
        type: data.type,
        description: data.description,
        memberIds: data.memberIds ?? [],
        leagueIds: data.leagueIds ?? [],
      });

      return organization;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new Error(
          `An organization with the name "${data.name}" already exists`
        );
      }
      throw error;
    }
  }

  /**
   * Update organization fields by ID.
   * Does not modify memberIds - use addMember/removeMember for that.
   *
   * Catches duplicate name errors on update as well.
   */
  async update(
    id: string,
    data: UpdateOrganizationData
  ): Promise<OrganizationDocument> {
    await connectMongoDB();

    if (data.type && !VALID_TYPES.includes(data.type)) {
      throw new Error(
        `Invalid organization type "${data.type}". Valid types are: ${VALID_TYPES.join(", ")}`
      );
    }

    try {
      const organization = await OrganizationModel.findByIdAndUpdate(
        id,
        { $set: data },
        { returnDocument: "after", runValidators: true }
      );

      if (!organization) {
        throw new Error(`Organization with id "${id}" not found`);
      }

      return organization;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new Error(
          `An organization with the name "${data.name}" already exists`
        );
      }
      throw error;
    }
  }

  /**
   * Add a person as a member of an organization.
   * Uses $addToSet to prevent duplicates in org.memberIds.
   * Also adds orgId to person.organizationIds (bidirectional).
   *
   * Requirement 2.2: Associate a Person with an Organization
   * Requirement 2.3: Allow a Person to belong to multiple Organizations simultaneously
   */
  async addMember(orgId: string, personId: string): Promise<void> {
    await connectMongoDB();

    const organization = await OrganizationModel.findById(orgId);
    if (!organization) {
      throw new Error(`Organization with id "${orgId}" not found`);
    }

    const person = await PersonModel.findById(personId);
    if (!person) {
      throw new Error(`Person with id "${personId}" not found`);
    }

    const personObjectId = new mongoose.Types.ObjectId(personId);
    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    // Add personId to org.memberIds (no duplicates)
    await OrganizationModel.findByIdAndUpdate(orgId, {
      $addToSet: { memberIds: personObjectId },
    });

    // Add orgId to person.organizationIds (no duplicates)
    await PersonModel.findByIdAndUpdate(personId, {
      $addToSet: { organizationIds: orgObjectId },
    });
  }

  /**
   * Remove a person from an organization.
   * Removes personId from org.memberIds and orgId from person.organizationIds.
   * Preserves the person's individual records (roles, category, results, etc.).
   *
   * Requirement 2.5: Disassociate a Person from an Organization while preserving
   *   the Person's individual records and other Organization memberships
   */
  async removeMember(orgId: string, personId: string): Promise<void> {
    await connectMongoDB();

    const organization = await OrganizationModel.findById(orgId);
    if (!organization) {
      throw new Error(`Organization with id "${orgId}" not found`);
    }

    const person = await PersonModel.findById(personId);
    if (!person) {
      throw new Error(`Person with id "${personId}" not found`);
    }

    const personObjectId = new mongoose.Types.ObjectId(personId);
    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    // Remove personId from org.memberIds
    await OrganizationModel.findByIdAndUpdate(orgId, {
      $pull: { memberIds: personObjectId },
    });

    // Remove orgId from person.organizationIds
    await PersonModel.findByIdAndUpdate(personId, {
      $pull: { organizationIds: orgObjectId },
    });
  }

  /**
   * Get all team-type organizations.
   * Used for standings computation to identify teams.
   *
   * Requirement 2.6: Distinguish Team-type Organizations for use in race standings
   */
  async getTeams(): Promise<OrganizationDocument[]> {
    await connectMongoDB();

    const teams = await OrganizationModel.find({ type: "team" }).sort({
      name: 1,
    });
    return teams;
  }

  /**
   * Fetch an organization by its ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<OrganizationDocument | null> {
    await connectMongoDB();

    const organization = await OrganizationModel.findById(id);
    return organization;
  }

  /**
   * List all organizations, optionally filtered by type.
   */
  async list(type?: OrganizationType): Promise<OrganizationDocument[]> {
    await connectMongoDB();

    const query: Record<string, unknown> = {};
    if (type) {
      query.type = type;
    }

    const organizations = await OrganizationModel.find(query).sort({ name: 1 });
    return organizations;
  }
}
