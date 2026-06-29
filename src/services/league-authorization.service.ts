/**
 * LeagueAuthorizationService - Business logic for league-level authorization.
 * Manages role checks (Super_Admin, League_Admin), league access validation,
 * and League_Admin role assignment/removal.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import { PersonModel } from "@/models/person.model";

export class LeagueAuthorizationService {
  /**
   * Check if a user can access a specific league.
   * Super_Admin: always allowed (unrestricted access to all leagues).
   * League_Admin: only if the league is in their assigned leagues.
   *
   * Requirement 12.1: Super_Administrator has unrestricted access
   * Requirement 12.2: League_Administrator has access only within assigned Leagues
   * Requirement 12.5: League_Admin granted full privileges for assigned leagues
   * Requirement 12.6: League_Admin denied for unassigned leagues
   */
  async canAccessLeague(userId: string, leagueId: string): Promise<boolean> {
    if (await this.isSuperAdmin(userId)) {
      return true;
    }
    return this.isLeagueAdmin(userId, leagueId);
  }

  /**
   * Check if a user has the Super_Administrator role.
   * Returns true if the person has adminScope.type === 'super'.
   *
   * Requirement 12.1: Super_Administrator unrestricted access
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    await connectMongoDB();

    const person = await PersonModel.findById(userId)
      .select("adminScope roles")
      .lean();

    if (!person) {
      return false;
    }

    return person.adminScope?.type === "super";
  }

  /**
   * Check if a user is a League_Admin for a specific league.
   * Returns true if the person has adminScope.type === 'league' and
   * the leagueId is in their adminScope.leagueIds.
   *
   * Requirement 12.2: League_Administrator scoped to assigned leagues
   * Requirement 12.5: Access granted for assigned leagues
   * Requirement 12.6: Access denied for unassigned leagues
   */
  async isLeagueAdmin(userId: string, leagueId: string): Promise<boolean> {
    await connectMongoDB();

    const person = await PersonModel.findById(userId)
      .select("adminScope roles")
      .lean();

    if (!person) {
      return false;
    }

    if (person.adminScope?.type !== "league") {
      return false;
    }

    const leagueIds = person.adminScope.leagueIds ?? [];
    return leagueIds.some((id) => id.toString() === leagueId);
  }

  /**
   * Get the list of leagues a League_Admin is assigned to.
   * Returns an empty array if the user is not a League_Admin.
   *
   * Requirement 12.4: League_Administrator can be assigned to multiple Leagues
   * Requirement 12.9: League_Selector shows only assigned leagues for League_Admin
   */
  async getAdminLeagues(userId: string): Promise<string[]> {
    await connectMongoDB();

    const person = await PersonModel.findById(userId)
      .select("adminScope")
      .lean();

    if (!person) {
      return [];
    }

    if (person.adminScope?.type !== "league") {
      return [];
    }

    const leagueIds = person.adminScope.leagueIds ?? [];
    return leagueIds.map((id) => id.toString());
  }

  /**
   * Assign the League_Administrator role to a person with specific league assignments.
   * Sets the 'league_administrator' role and configures adminScope with type 'league'
   * and the specified leagueIds.
   *
   * Requirement 12.3: Super_Admin specifies leagues when assigning League_Admin
   * Requirement 12.4: League_Admin can be assigned to multiple leagues
   * Requirement 12.8: League_Admin assignment restricted to Super_Admins
   */
  async assignLeagueAdmin(personId: string, leagueIds: string[]): Promise<void> {
    await connectMongoDB();

    const person = await PersonModel.findById(personId);

    if (!person) {
      const error = new Error(`Person with id "${personId}" not found`);
      (error as Error & { code: string; statusCode: number }).code =
        "PERSON_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    // Add 'league_administrator' role if not already present
    if (!person.roles.includes("league_administrator")) {
      person.roles.push("league_administrator");
    }

    // Set adminScope to league type with specified leagueIds
    person.adminScope = {
      type: "league",
      leagueIds: leagueIds,
    };

    await person.save();
  }

  /**
   * Remove the League_Administrator role from a person.
   * Removes the 'league_administrator' role and unsets adminScope.
   *
   * Requirement 12.8: League_Admin assignment/removal restricted to Super_Admins
   */
  async removeLeagueAdmin(personId: string): Promise<void> {
    await connectMongoDB();

    const person = await PersonModel.findById(personId);

    if (!person) {
      const error = new Error(`Person with id "${personId}" not found`);
      (error as Error & { code: string; statusCode: number }).code =
        "PERSON_NOT_FOUND";
      (error as Error & { code: string; statusCode: number }).statusCode = 404;
      throw error;
    }

    // Remove 'league_administrator' role
    person.roles = person.roles.filter((r) => r !== "league_administrator");

    // Unset adminScope using updateOne to properly remove the field
    await PersonModel.updateOne(
      { _id: personId },
      {
        $set: { roles: person.roles },
        $unset: { adminScope: "" },
      }
    );
  }
}
