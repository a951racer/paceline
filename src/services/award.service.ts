/**
 * AwardService - Business logic for managing awards, award assignments, and peer nominations.
 * Handles award definition, admin assignment, peer nomination submission (with self-nomination prevention),
 * and nomination approval.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.6, 8.7, 8.8, 8.9, 8.10
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  AwardModel,
  type AwardDocument,
  AssignedAwardModel,
  type AssignedAwardDocument,
  PeerNominationModel,
  type PeerNominationDocument,
} from "@/models/award.model";
import { SeasonModel } from "@/models/season.model";
import type { CreateAwardInput } from "@/lib/validations/award";

/** Data for submitting a peer nomination */
export interface SubmitNominationData {
  nominatorId: string;
  nomineeId: string;
  awardId: string;
  seasonId: string;
  reason?: string;
}

export class AwardService {
  /**
   * Define (create) a new award with nomination type and badge.
   *
   * Requirement 8.1: Store Award with name, description, badge, and nomination type
   */
  async define(data: CreateAwardInput): Promise<AwardDocument> {
    await connectMongoDB();

    const award = await AwardModel.create({
      name: data.name,
      description: data.description,
      badgeUrl: data.badgeUrl,
      nominationType: data.nominationType,
    });

    return award;
  }

  /**
   * Admin-assign an award to a person for a specific league-season.
   *
   * Requirement 8.2: Record award, recipient, date, season, and nomination source
   * Requirement 8.3: Allow awards to be assigned to any person regardless of role
   * Requirement 8.9: Track whether award originated from admin-assigned or peer-nominated source
   * Requirement 8.10: Associate each assigned award with the active season at time of assignment
   * Requirement 5.5: Award assignment scoped to active league-season context
   */
  async assign(
    awardId: string,
    personId: string,
    seasonId: string,
    leagueId: string
  ): Promise<AssignedAwardDocument> {
    await connectMongoDB();

    const assignedAward = await AssignedAwardModel.create({
      awardId,
      recipientId: personId,
      leagueId,
      seasonId,
      assignedAt: new Date(),
      source: "admin_assigned",
    });

    return assignedAward;
  }

  /**
   * Submit a peer nomination. Validates that a person cannot nominate themselves.
   *
   * Requirement 8.6: Record nominating person, nominated person, award, and date
   * Requirement 8.7: Prevent self-nomination
   */
  async submitNomination(
    data: SubmitNominationData
  ): Promise<PeerNominationDocument> {
    await connectMongoDB();

    // Validate no self-nomination
    if (data.nominatorId === data.nomineeId) {
      throw new Error("A person cannot nominate themselves");
    }

    const nomination = await PeerNominationModel.create({
      nominatorId: data.nominatorId,
      nomineeId: data.nomineeId,
      awardId: data.awardId,
      seasonId: data.seasonId,
      reason: data.reason,
      status: "pending",
    });

    return nomination;
  }

  /**
   * Approve a peer nomination and assign the award to the nominee.
   * Uses the currently active season for the award assignment.
   *
   * Requirement 8.8: Require admin approval before award is assigned
   * Requirement 8.9: Track that the award originated from peer-nominated source
   * Requirement 8.10: Associate assigned award with active season
   * Requirement 5.5: Award assignment scoped to active league-season context
   */
  async approveNomination(
    nominationId: string,
    leagueId: string,
    reviewerId?: string
  ): Promise<AssignedAwardDocument> {
    await connectMongoDB();

    // Find the nomination
    const nomination = await PeerNominationModel.findById(nominationId);
    if (!nomination) {
      throw new Error(`Nomination with id "${nominationId}" not found`);
    }

    if (nomination.status !== "pending") {
      throw new Error(
        `Nomination is already ${nomination.status} and cannot be approved`
      );
    }

    // Update nomination status to approved
    nomination.status = "approved";
    nomination.reviewedAt = new Date();
    if (reviewerId) {
      nomination.reviewedBy = new (await import("mongoose")).Types.ObjectId(
        reviewerId
      ) as unknown as typeof nomination.reviewedBy;
    }
    await nomination.save();

    // Get the active season for assignment
    const activeSeason = await SeasonModel.findOne({ isActive: true, leagueId });
    const seasonId = activeSeason
      ? activeSeason._id.toString()
      : nomination.seasonId.toString();

    // Assign the award to the nominee
    const assignedAward = await AssignedAwardModel.create({
      awardId: nomination.awardId,
      recipientId: nomination.nomineeId,
      leagueId,
      seasonId,
      assignedAt: new Date(),
      source: "peer_nominated",
      nominationId: nomination._id,
    });

    return assignedAward;
  }
}
