/**
 * EnrollmentService - Business logic for managing person and organization enrollments
 * in league-season combinations.
 *
 * Handles enrollment creation with duplicate prevention, removal with historical data
 * preservation, and querying of enrollment records.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  EnrollmentModel,
  type EnrollmentDocument,
  type EnrollmentEntityType,
} from "@/models/enrollment.model";
import mongoose from "mongoose";

export class EnrollmentService {
  /**
   * Enroll a person in a league-season combination.
   * Returns ENROLLMENT_DUPLICATE error if already enrolled.
   *
   * Requirement 3.1: Create an Enrollment record associating Person with League-Season
   * Requirement 3.5: Prevent duplicate Enrollments for same Person in same League_Season
   */
  async enrollPerson(
    personId: string,
    leagueId: string,
    seasonId: string,
    enrolledBy: string
  ): Promise<EnrollmentDocument> {
    await connectMongoDB();

    return this.createEnrollment("person", personId, leagueId, seasonId, enrolledBy);
  }

  /**
   * Enroll an organization in a league-season combination.
   * Returns ENROLLMENT_DUPLICATE error if already enrolled.
   *
   * Requirement 4.1: Create an Enrollment record associating Organization with League-Season
   * Requirement 4.5: Prevent duplicate Enrollments for same Organization in same League_Season
   */
  async enrollOrganization(
    orgId: string,
    leagueId: string,
    seasonId: string,
    enrolledBy: string
  ): Promise<EnrollmentDocument> {
    await connectMongoDB();

    return this.createEnrollment("organization", orgId, leagueId, seasonId, enrolledBy);
  }

  /**
   * Remove a person's enrollment from a league-season.
   * Only deletes the enrollment record - does NOT delete race results, achievements, or awards.
   *
   * Requirement 3.4: Disassociate Person from League_Season while preserving historical
   * Race_Results, Achievements, and Awards
   */
  async removePerson(
    personId: string,
    leagueId: string,
    seasonId: string
  ): Promise<void> {
    await connectMongoDB();

    const result = await EnrollmentModel.deleteOne({
      entityType: "person",
      entityId: new mongoose.Types.ObjectId(personId),
      leagueId: new mongoose.Types.ObjectId(leagueId),
      seasonId: new mongoose.Types.ObjectId(seasonId),
    });

    if (result.deletedCount === 0) {
      const error = new Error(
        `Enrollment not found for person "${personId}" in league "${leagueId}" season "${seasonId}"`
      );
      (error as Error & { code: string; statusCode: number }).code =
        "ENROLLMENT_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }
  }

  /**
   * Remove an organization's enrollment from a league-season.
   * Only deletes the enrollment record - does NOT delete team standings or historical data.
   *
   * Requirement 4.4: Disassociate Organization from League_Season while preserving
   * historical Team_Standings and Trophy_Case data
   */
  async removeOrganization(
    orgId: string,
    leagueId: string,
    seasonId: string
  ): Promise<void> {
    await connectMongoDB();

    const result = await EnrollmentModel.deleteOne({
      entityType: "organization",
      entityId: new mongoose.Types.ObjectId(orgId),
      leagueId: new mongoose.Types.ObjectId(leagueId),
      seasonId: new mongoose.Types.ObjectId(seasonId),
    });

    if (result.deletedCount === 0) {
      const error = new Error(
        `Enrollment not found for organization "${orgId}" in league "${leagueId}" season "${seasonId}"`
      );
      (error as Error & { code: string; statusCode: number }).code =
        "ENROLLMENT_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }
  }

  /**
   * Get all enrollments for a person across all leagues.
   *
   * Requirement 3.2: Allow a Person to be enrolled in multiple League_Season combinations
   * Requirement 3.3: Allow a Person to be enrolled in League_Seasons across different Leagues
   */
  async getPersonEnrollments(personId: string): Promise<EnrollmentDocument[]> {
    await connectMongoDB();

    return EnrollmentModel.find({
      entityType: "person",
      entityId: new mongoose.Types.ObjectId(personId),
    }).sort({ enrolledAt: -1 });
  }

  /**
   * Get all enrollments for an organization across all leagues.
   *
   * Requirement 4.2: Allow an Organization to be enrolled in multiple League_Season combinations
   * Requirement 4.3: Allow an Organization to be enrolled in League_Seasons across different Leagues
   */
  async getOrganizationEnrollments(
    orgId: string
  ): Promise<EnrollmentDocument[]> {
    await connectMongoDB();

    return EnrollmentModel.find({
      entityType: "organization",
      entityId: new mongoose.Types.ObjectId(orgId),
    }).sort({ enrolledAt: -1 });
  }

  /**
   * List enrollments filtered by league-season and optional entity type.
   *
   * Requirement 3.7: Filter by Active_League_Context and selected Season
   * Requirement 4.7: Filter Organizations by Active_League_Context and selected Season
   */
  async listByLeagueSeason(
    leagueId: string,
    seasonId: string,
    type?: EnrollmentEntityType
  ): Promise<EnrollmentDocument[]> {
    await connectMongoDB();

    const filter: Record<string, unknown> = {
      leagueId: new mongoose.Types.ObjectId(leagueId),
      seasonId: new mongoose.Types.ObjectId(seasonId),
    };

    if (type) {
      filter.entityType = type;
    }

    return EnrollmentModel.find(filter).sort({ enrolledAt: -1 });
  }

  /**
   * Check if a person is enrolled in a specific league-season.
   *
   * Requirement 3.6: Exclude non-enrolled persons from Standings and Achievement tracking
   */
  async isPersonEnrolled(
    personId: string,
    leagueId: string,
    seasonId: string
  ): Promise<boolean> {
    await connectMongoDB();

    const count = await EnrollmentModel.countDocuments({
      entityType: "person",
      entityId: new mongoose.Types.ObjectId(personId),
      leagueId: new mongoose.Types.ObjectId(leagueId),
      seasonId: new mongoose.Types.ObjectId(seasonId),
    });

    return count > 0;
  }

  /**
   * Check if an organization is enrolled in a specific league-season.
   *
   * Requirement 4.6: Exclude non-enrolled organizations from Team_Standings
   */
  async isOrgEnrolled(
    orgId: string,
    leagueId: string,
    seasonId: string
  ): Promise<boolean> {
    await connectMongoDB();

    const count = await EnrollmentModel.countDocuments({
      entityType: "organization",
      entityId: new mongoose.Types.ObjectId(orgId),
      leagueId: new mongoose.Types.ObjectId(leagueId),
      seasonId: new mongoose.Types.ObjectId(seasonId),
    });

    return count > 0;
  }

  /**
   * Internal method to create an enrollment with duplicate prevention.
   * Catches the unique index violation and returns a user-friendly error.
   */
  private async createEnrollment(
    entityType: EnrollmentEntityType,
    entityId: string,
    leagueId: string,
    seasonId: string,
    enrolledBy: string
  ): Promise<EnrollmentDocument> {
    try {
      const enrollment = await EnrollmentModel.create({
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        leagueId: new mongoose.Types.ObjectId(leagueId),
        seasonId: new mongoose.Types.ObjectId(seasonId),
        enrolledAt: new Date(),
        enrolledBy: new mongoose.Types.ObjectId(enrolledBy),
        isActive: true,
      });

      return enrollment;
    } catch (error: unknown) {
      // MongoDB duplicate key error (code 11000) from unique compound index
      if (
        error instanceof Error &&
        "code" in error &&
        (error as Error & { code: number }).code === 11000
      ) {
        const duplicateError = new Error(
          `${entityType} "${entityId}" is already enrolled in league "${leagueId}" season "${seasonId}"`
        );
        (duplicateError as Error & { code: string; statusCode: number }).code =
          "ENROLLMENT_DUPLICATE";
        (
          duplicateError as Error & { code: string; statusCode: number }
        ).statusCode = 409;
        throw duplicateError;
      }
      throw error;
    }
  }
}
