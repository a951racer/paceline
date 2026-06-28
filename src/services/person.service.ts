/**
 * PersonService - Business logic for managing people in the league.
 * Handles CRUD operations, role assignment/removal, and filtered listing.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import { PersonModel, type PersonDocument } from "@/models/person.model";
import type { Role, Category } from "@/types";

/** Valid roles for validation */
const VALID_ROLES: Role[] = [
  "racer",
  "volunteer",
  "mentor",
  "race_official",
  "administrator",
];

/** Data for creating a new person */
export interface CreatePersonData {
  name: { first: string; last: string };
  email: string;
  phone?: string;
  roles?: Role[];
  category?: Category;
  usaCyclingLicense?: string;
  organizationIds?: string[];
  isRegistered?: boolean;
}

/** Data for updating a person */
export interface UpdatePersonData {
  name?: { first: string; last: string };
  email?: string;
  phone?: string;
  category?: Category;
  usaCyclingLicense?: string;
  organizationIds?: string[];
  isRegistered?: boolean;
}

/** Filters for listing people */
export interface PersonListFilters {
  roles?: Role[];
  category?: Category;
  name?: string;
  organizationId?: string;
}

export class PersonService {
  /**
   * Create a new person with name, contact info, and optional roles.
   * Validates role values before creation.
   *
   * Requirement 1.1: Create a Person record with name and contact information
   * Requirement 1.2: Associate one or more roles with a Person
   */
  async create(data: CreatePersonData): Promise<PersonDocument> {
    await connectMongoDB();

    if (data.roles && data.roles.length > 0) {
      this.validateRoles(data.roles);
    }

    const person = await PersonModel.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      roles: data.roles ?? [],
      category: data.category,
      usaCyclingLicense: data.usaCyclingLicense,
      organizationIds: data.organizationIds ?? [],
      isRegistered: data.isRegistered ?? false,
    });

    return person;
  }

  /**
   * Update person fields by ID.
   * Does not modify roles - use assignRoles/removeRole for that.
   */
  async update(
    id: string,
    data: UpdatePersonData
  ): Promise<PersonDocument | null> {
    await connectMongoDB();

    const person = await PersonModel.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: "after", runValidators: true }
    );

    if (!person) {
      throw new Error(`Person with id "${id}" not found`);
    }

    return person;
  }

  /**
   * Add roles to a person without duplicates (addToSet behavior).
   * Validates that all provided roles are valid.
   *
   * Requirement 1.2: Associate one or more roles with a Person
   * Requirement 1.3: Allow a Person to hold multiple roles simultaneously
   */
  async assignRoles(id: string, roles: Role[]): Promise<PersonDocument> {
    await connectMongoDB();

    if (!roles || roles.length === 0) {
      throw new Error("At least one role must be provided");
    }

    this.validateRoles(roles);

    const person = await PersonModel.findByIdAndUpdate(
      id,
      { $addToSet: { roles: { $each: roles } } },
      { returnDocument: "after", runValidators: true }
    );

    if (!person) {
      throw new Error(`Person with id "${id}" not found`);
    }

    return person;
  }

  /**
   * Remove a single role from a person while preserving all other data.
   * This operation preserves other roles and historical data.
   *
   * Requirement 1.4: Disassociate a role while preserving other assigned roles and historical data
   */
  async removeRole(id: string, role: Role): Promise<PersonDocument> {
    await connectMongoDB();

    if (!VALID_ROLES.includes(role)) {
      throw new Error(
        `Invalid role "${role}". Valid roles are: ${VALID_ROLES.join(", ")}`
      );
    }

    const person = await PersonModel.findById(id);

    if (!person) {
      throw new Error(`Person with id "${id}" not found`);
    }

    if (!person.roles.includes(role)) {
      throw new Error(
        `Person does not have role "${role}". Current roles: ${person.roles.join(", ")}`
      );
    }

    const updatedPerson = await PersonModel.findByIdAndUpdate(
      id,
      { $pull: { roles: role } },
      { returnDocument: "after" }
    );

    return updatedPerson!;
  }

  /**
   * Fetch a person by their ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<PersonDocument | null> {
    await connectMongoDB();

    const person = await PersonModel.findById(id);
    return person;
  }

  /**
   * List people with optional filtering by roles, category, name, or organizationId.
   */
  async list(filters?: PersonListFilters): Promise<PersonDocument[]> {
    await connectMongoDB();

    const query: Record<string, unknown> = {};

    if (filters?.roles && filters.roles.length > 0) {
      query.roles = { $in: filters.roles };
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.name) {
      const nameRegex = new RegExp(filters.name, "i");
      query.$or = [
        { "name.first": nameRegex },
        { "name.last": nameRegex },
      ];
    }

    if (filters?.organizationId) {
      query.organizationIds = filters.organizationId;
    }

    const people = await PersonModel.find(query).sort({ "name.last": 1, "name.first": 1 });
    return people;
  }

  /**
   * Validate that all provided roles are valid Role values.
   */
  private validateRoles(roles: Role[]): void {
    for (const role of roles) {
      if (!VALID_ROLES.includes(role)) {
        throw new Error(
          `Invalid role "${role}". Valid roles are: ${VALID_ROLES.join(", ")}`
        );
      }
    }
  }
}
