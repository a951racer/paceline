/**
 * StandingsService - Business logic for computing and managing individual and team standings.
 * Handles standings calculation per competition, applying scoring methods,
 * eligibility criteria, and TimescaleDB history snapshots.
 *
 * All methods are scoped to a league-season combination. Non-enrolled entities
 * are excluded from standings even if race results exist.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.13, 6.17
 * Requirements (multi-league): 5.2, 5.7, 7.5, 7.6, 7.7
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import { StandingModel, type StandingDocument, TeamStandingModel, type TeamStandingDocument } from "@/models/standing.model";
import { RaceResultModel } from "@/models/race-result.model";
import {
  CompetitionModel,
} from "@/models/competition.model";
import { RaceModel } from "@/models/race.model";
import { PersonModel } from "@/models/person.model";
import { OrganizationModel } from "@/models/organization.model";
import { EnrollmentModel } from "@/models/enrollment.model";
import { CompetitionService } from "@/services/competition.service";
import { queryWithRetry } from "@/lib/db/timescaledb";
import { setOnResultsEnteredCallback } from "@/services/race-result.service";
import { notifyStandingsUpdated } from "@/services/calculated-recognition.service";

/** Aggregated racer data during standings calculation */
interface RacerStandingData {
  racerId: string;
  category: string;
  teamId?: string;
  results: {
    raceId: string;
    position: number;
    points: number;
    finishTime: number;
  }[];
}

export class StandingsService {
  private competitionService: CompetitionService;

  constructor() {
    this.competitionService = new CompetitionService();
  }

  /**
   * Calculate standings for a specific competition in a league-season.
   *
   * 1. Fetch the competition to get scoring method and eligibility criteria
   * 2. Get enrolled racer IDs for the league-season
   * 3. Fetch race results for the league-season, filtered to enrolled racers only
   * 4. For each result, check eligibility against the competition
   * 5. Group eligible results by racerId
   * 6. Apply scoring method (points/time/position_average)
   * 7. Sort and assign positions
   * 8. Upsert standings in MongoDB with leagueId
   * 9. Insert standings history snapshot into TimescaleDB
   *
   * Requirement 6.1: Compute Standings by aggregating Race_Results within each Competition
   * Requirement 6.2: Recalculate affected Standings when Race_Results are updated
   * Requirement 6.13: Evaluate Race_Result against competitions and include in matching standings
   * Requirement 7.5: Non-enrolled entities excluded from standings
   * Requirement 7.6: Only enrolled racers/teams appear in standings
   * Requirement 7.7: Standings recalculation only affects the specific league-season
   */
  async calculate(
    competitionId: string,
    seasonId: string,
    leagueId: string
  ): Promise<StandingDocument[]> {
    await connectMongoDB();

    // 1. Fetch the competition
    const competition = await CompetitionModel.findById(competitionId);
    if (!competition) {
      throw new Error(`Competition with id "${competitionId}" not found`);
    }

    // 2. Get enrolled racer IDs for the league-season (Req 7.5, 7.6)
    const enrolledPersons = await EnrollmentModel.find({
      leagueId,
      seasonId,
      entityType: "person",
    }).select("entityId");
    const enrolledRacerIds = new Set(
      enrolledPersons.map((e) => e.entityId.toString())
    );

    // 3. Fetch race results for the league-season
    const raceResults = await RaceResultModel.find({ seasonId, leagueId });

    // 4 & 5. Check eligibility, filter by enrollment, and group by racerId
    const racerDataMap = new Map<string, RacerStandingData>();

    for (const result of raceResults) {
      const racerId = result.racerId.toString();

      // Filter out non-enrolled racers (Req 7.5)
      if (!enrolledRacerIds.has(racerId)) {
        continue;
      }

      // Get the race to check raceType for eligibility
      const race = await RaceModel.findById(result.raceId);
      if (!race) continue;

      // Check eligibility
      const isEligible = this.competitionService.evaluateEligibility(
        {
          category: result.category,
          raceType: race.raceType,
          raceId: result.raceId.toString(),
        },
        competition
      );

      if (!isEligible) continue;

      if (!racerDataMap.has(racerId)) {
        // Get racer's team affiliation
        const person = await PersonModel.findById(racerId);
        const teamId = person?.organizationIds?.[0]?.toString();

        racerDataMap.set(racerId, {
          racerId,
          category: result.category,
          teamId,
          results: [],
        });
      }

      const racerData = racerDataMap.get(racerId)!;

      // Compute points from pointsTable if scoring method is "points"
      let points = 0;
      if (competition.scoringMethod.type === "points") {
        const pointsTable = competition.scoringMethod.pointsTable;
        if (pointsTable) {
          points = pointsTable.get(String(result.position)) ?? 0;
        }
      }

      racerData.results.push({
        raceId: result.raceId.toString(),
        position: result.position,
        points,
        finishTime: result.finishTime,
      });
    }

    // 6. Apply scoring method
    const scoringMethod = competition.scoringMethod;
    const standings: {
      racerId: string;
      category: string;
      teamId?: string;
      totalPoints: number;
      totalRaces: number;
      results: { raceId: string; position: number; points: number; finishTime: number }[];
    }[] = [];

    for (const [, racerData] of racerDataMap) {
      let totalPoints = 0;
      let resultsToCount = racerData.results;

      if (scoringMethod.type === "points") {
        // If countBestN is set, only count top-N highest-scoring results
        if (scoringMethod.countBestN && resultsToCount.length > scoringMethod.countBestN) {
          resultsToCount = [...resultsToCount]
            .sort((a, b) => b.points - a.points)
            .slice(0, scoringMethod.countBestN);
        }
        totalPoints = resultsToCount.reduce((sum, r) => sum + r.points, 0);
      } else if (scoringMethod.type === "time") {
        // Sum all finish times - lower is better
        totalPoints = racerData.results.reduce((sum, r) => sum + r.finishTime, 0);
      } else if (scoringMethod.type === "position_average") {
        // Average all positions - lower is better
        const posSum = racerData.results.reduce((sum, r) => sum + r.position, 0);
        totalPoints = racerData.results.length > 0
          ? posSum / racerData.results.length
          : 0;
      }

      standings.push({
        racerId: racerData.racerId,
        category: racerData.category,
        teamId: racerData.teamId,
        totalPoints,
        totalRaces: racerData.results.length,
        results: racerData.results,
      });
    }

    // 7. Sort by total points/time/average and assign positions
    if (scoringMethod.type === "points") {
      // Higher points = better position
      standings.sort((a, b) => b.totalPoints - a.totalPoints);
    } else {
      // Lower time/average = better position (ascending)
      standings.sort((a, b) => a.totalPoints - b.totalPoints);
    }

    // Assign 1-indexed positions
    standings.forEach((s, index) => {
      (s as { position?: number }).position = index + 1;
    });

    // 8. Upsert standings in MongoDB with leagueId
    const savedStandings: StandingDocument[] = [];
    for (const standing of standings) {
      const doc = await StandingModel.findOneAndUpdate(
        {
          competitionId,
          seasonId,
          leagueId,
          racerId: standing.racerId,
        },
        {
          $set: {
            leagueId,
            category: standing.category,
            teamId: standing.teamId,
            totalPoints: standing.totalPoints,
            totalRaces: standing.totalRaces,
            position: (standing as { position?: number }).position,
            results: standing.results,
            lastUpdated: new Date(),
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      savedStandings.push(doc);
    }

    // Remove standings for racers no longer in the competition for this league-season
    const currentRacerIds = standings.map((s) => s.racerId);
    await StandingModel.deleteMany({
      competitionId,
      seasonId,
      leagueId,
      racerId: { $nin: currentRacerIds },
    });

    // 9. Insert standings history snapshot into TimescaleDB
    await this.insertStandingsHistory(competitionId, seasonId, leagueId, savedStandings);

    return savedStandings;
  }

  /**
   * Recalculate all standings for a league-season across all active competitions.
   * Handles both individual and team competitions.
   * Only affects the specific league-season (isolation guarantee - Req 7.7).
   *
   * Requirement 6.2: Recalculate affected Standings when Race_Results are updated
   * Requirement 6.9: Recalculate team standings when membership changes
   * Requirement 7.7: Standings recalculation only affects the specific league-season
   */
  async recalculateAll(seasonId: string, leagueId: string): Promise<void> {
    await connectMongoDB();

    // Get all active individual competitions for the league-season
    const individualCompetitions = await CompetitionModel.find({
      seasonId,
      leagueId,
      isActive: true,
      type: "individual",
    });

    for (const competition of individualCompetitions) {
      await this.calculate(competition._id.toString(), seasonId, leagueId);
    }

    // Get all active team competitions for the league-season
    const teamCompetitions = await CompetitionModel.find({
      seasonId,
      leagueId,
      isActive: true,
      type: "team",
    });

    for (const competition of teamCompetitions) {
      await this.calculateTeam(competition._id.toString(), seasonId, leagueId);
    }

    // Notify that standings have been updated so recognitions can be recomputed
    notifyStandingsUpdated(seasonId, leagueId);
  }

  /**
   * Calculate team standings for a specific team-type competition in a league-season.
   *
   * 1. Fetch the competition (must be type 'team')
   * 2. Get enrolled organization IDs for the league-season
   * 3. For each enrolled team:
   *    a. Get all member person IDs from the organization
   *    b. Fetch race results for enrolled members in the league-season
   *    c. Check eligibility of each result against the competition
   *    d. Aggregate points using the competition's scoring method
   * 4. Sort teams by totalPoints and assign positions
   * 5. Upsert team standings in MongoDB with leagueId
   * 6. Insert team standings history into TimescaleDB
   *
   * Requirement 6.6: Compute Team_Standings by aggregating Race_Results of team members
   * Requirement 6.7: Include Race_Result in Team_Standing for the racer's team
   * Requirement 6.17: Compute Team Championship Standings by aggregating all member results
   * Requirement 7.6: Only enrolled teams appear in standings
   */
  async calculateTeam(
    competitionId: string,
    seasonId: string,
    leagueId: string
  ): Promise<TeamStandingDocument[]> {
    await connectMongoDB();

    // 1. Fetch the competition (must be type 'team')
    const competition = await CompetitionModel.findById(competitionId);
    if (!competition) {
      throw new Error(`Competition with id "${competitionId}" not found`);
    }

    if (competition.type !== "team") {
      throw new Error(
        `Competition "${competitionId}" is not a team competition (type: "${competition.type}")`
      );
    }

    // 2. Get enrolled organization IDs for the league-season (Req 7.6)
    const enrolledOrgs = await EnrollmentModel.find({
      leagueId,
      seasonId,
      entityType: "organization",
    }).select("entityId");
    const enrolledOrgIds = new Set(
      enrolledOrgs.map((e) => e.entityId.toString())
    );

    // Get all team-type organizations that are enrolled
    const teams = await OrganizationModel.find({
      type: "team",
      _id: { $in: Array.from(enrolledOrgIds) },
    });

    // 3. For each enrolled team, aggregate member results
    const teamStandingsData: {
      organizationId: string;
      totalPoints: number;
      totalRaces: number;
      memberResults: { racerId: string; raceId: string; points: number }[];
    }[] = [];

    for (const team of teams) {
      const memberIds = team.memberIds.map((id) => id.toString());

      if (memberIds.length === 0) {
        continue;
      }

      // b. Fetch race results for team members in the league-season
      const raceResults = await RaceResultModel.find({
        seasonId,
        leagueId,
        racerId: { $in: memberIds },
      });

      const memberResults: { racerId: string; raceId: string; points: number }[] = [];
      const countedRaceIds = new Set<string>();

      for (const result of raceResults) {
        // c. Check eligibility
        const race = await RaceModel.findById(result.raceId);
        if (!race) continue;

        const isEligible = this.competitionService.evaluateEligibility(
          {
            category: result.category,
            raceType: race.raceType,
            raceId: result.raceId.toString(),
          },
          competition
        );

        if (!isEligible) continue;

        // d. Compute points based on scoring method
        let points = 0;
        if (competition.scoringMethod.type === "points") {
          const pointsTable = competition.scoringMethod.pointsTable;
          if (pointsTable) {
            points = pointsTable.get(String(result.position)) ?? 0;
          }
        } else if (competition.scoringMethod.type === "time") {
          points = result.finishTime;
        } else if (competition.scoringMethod.type === "position_average") {
          points = result.position;
        }

        memberResults.push({
          racerId: result.racerId.toString(),
          raceId: result.raceId.toString(),
          points,
        });

        countedRaceIds.add(result.raceId.toString());
      }

      if (memberResults.length === 0) {
        continue;
      }

      // Sum all member points for team total
      const totalPoints = memberResults.reduce((sum, r) => sum + r.points, 0);

      teamStandingsData.push({
        organizationId: team._id.toString(),
        totalPoints,
        totalRaces: countedRaceIds.size,
        memberResults,
      });
    }

    // 4. Sort teams by totalPoints descending (for points) or ascending (for time/position_average)
    if (competition.scoringMethod.type === "points") {
      teamStandingsData.sort((a, b) => b.totalPoints - a.totalPoints);
    } else {
      teamStandingsData.sort((a, b) => a.totalPoints - b.totalPoints);
    }

    // Assign positions
    teamStandingsData.forEach((t, index) => {
      (t as { position?: number }).position = index + 1;
    });

    // 5. Upsert team standings in MongoDB with leagueId
    const savedStandings: TeamStandingDocument[] = [];
    for (const standing of teamStandingsData) {
      const doc = await TeamStandingModel.findOneAndUpdate(
        {
          competitionId,
          seasonId,
          leagueId,
          organizationId: standing.organizationId,
        },
        {
          $set: {
            leagueId,
            totalPoints: standing.totalPoints,
            totalRaces: standing.totalRaces,
            position: (standing as { position?: number }).position,
            memberResults: standing.memberResults,
            lastUpdated: new Date(),
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      savedStandings.push(doc);
    }

    // Remove team standings for teams no longer in the competition for this league-season
    const currentOrgIds = teamStandingsData.map((t) => t.organizationId);
    await TeamStandingModel.deleteMany({
      competitionId,
      seasonId,
      leagueId,
      organizationId: { $nin: currentOrgIds },
    });

    // 6. Insert team standings history into TimescaleDB
    await this.insertTeamStandingsHistory(competitionId, seasonId, leagueId, savedStandings);

    return savedStandings;
  }

  /**
   * Insert a standings history snapshot into TimescaleDB.
   * Records the current position, total_points, and total_races for each racer.
   */
  private async insertStandingsHistory(
    competitionId: string,
    seasonId: string,
    leagueId: string,
    standings: StandingDocument[]
  ): Promise<void> {
    if (standings.length === 0) return;

    const now = new Date().toISOString();

    for (const standing of standings) {
      try {
        await queryWithRetry(
          `INSERT INTO standings_history (time, person_id, competition_id, season_id, league_id, position, total_points, total_races)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            now,
            standing.racerId.toString(),
            competitionId,
            seasonId,
            leagueId,
            standing.position,
            standing.totalPoints,
            standing.totalRaces,
          ]
        );
      } catch (error) {
        // Log but don't fail the standings calculation if TimescaleDB insert fails
        console.error(
          "[StandingsService] Failed to insert standings history:",
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  /**
   * Insert a team standings history snapshot into TimescaleDB.
   * Records the current position and total_points for each team.
   */
  private async insertTeamStandingsHistory(
    competitionId: string,
    seasonId: string,
    leagueId: string,
    standings: TeamStandingDocument[]
  ): Promise<void> {
    if (standings.length === 0) return;

    const now = new Date().toISOString();

    for (const standing of standings) {
      try {
        await queryWithRetry(
          `INSERT INTO team_standings_history (time, organization_id, competition_id, season_id, league_id, position, total_points)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            now,
            standing.organizationId.toString(),
            competitionId,
            seasonId,
            leagueId,
            standing.position,
            standing.totalPoints,
          ]
        );
      } catch (error) {
        // Log but don't fail the standings calculation if TimescaleDB insert fails
        console.error(
          "[StandingsService] Failed to insert team standings history:",
          error instanceof Error ? error.message : error
        );
      }
    }
  }
}

/**
 * Wire the StandingsService into the RaceResultService callback
 * so standings are recalculated automatically after results are entered.
 * The callback retrieves the leagueId from the race to scope recalculation.
 */
export function wireStandingsRecalculation(): void {
  const standingsService = new StandingsService();
  setOnResultsEnteredCallback(async (raceId: string, seasonId: string) => {
    try {
      // Get leagueId from the race
      const race = await RaceModel.findById(raceId);
      if (!race) {
        console.error(
          `[StandingsService] Cannot recalculate: race "${raceId}" not found`
        );
        return;
      }
      const leagueId = race.leagueId.toString();
      await standingsService.recalculateAll(seasonId, leagueId);
    } catch (error) {
      console.error(
        "[StandingsService] Failed to recalculate standings:",
        error instanceof Error ? error.message : error
      );
    }
  });
}
