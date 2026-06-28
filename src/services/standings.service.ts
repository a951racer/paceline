/**
 * StandingsService - Business logic for computing and managing individual and team standings.
 * Handles standings calculation per competition, applying scoring methods,
 * eligibility criteria, and TimescaleDB history snapshots.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.13, 6.17
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import { StandingModel, type StandingDocument, TeamStandingModel, type TeamStandingDocument } from "@/models/standing.model";
import { RaceResultModel } from "@/models/race-result.model";
import {
  CompetitionModel,
  type CompetitionDocument,
} from "@/models/competition.model";
import { RaceModel } from "@/models/race.model";
import { PersonModel } from "@/models/person.model";
import { OrganizationModel } from "@/models/organization.model";
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
   * Calculate standings for a specific competition in a season.
   *
   * 1. Fetch the competition to get scoring method and eligibility criteria
   * 2. Fetch all race results for the season
   * 3. For each result, check eligibility against the competition
   * 4. Group eligible results by racerId
   * 5. Apply scoring method (points/time/position_average)
   * 6. Sort and assign positions
   * 7. Upsert standings in MongoDB
   * 8. Insert standings history snapshot into TimescaleDB
   *
   * Requirement 6.1: Compute Standings by aggregating Race_Results within each Competition
   * Requirement 6.2: Recalculate affected Standings when Race_Results are updated
   * Requirement 6.13: Evaluate Race_Result against competitions and include in matching standings
   */
  async calculate(
    competitionId: string,
    seasonId: string
  ): Promise<StandingDocument[]> {
    await connectMongoDB();

    // 1. Fetch the competition
    const competition = await CompetitionModel.findById(competitionId);
    if (!competition) {
      throw new Error(`Competition with id "${competitionId}" not found`);
    }

    // 2. Fetch all race results for the season
    const raceResults = await RaceResultModel.find({ seasonId });

    // 3 & 4. Check eligibility and group by racerId
    const racerDataMap = new Map<string, RacerStandingData>();

    for (const result of raceResults) {
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

      const racerId = result.racerId.toString();

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

    // 5. Apply scoring method
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

    // 6. Sort by total points/time/average and assign positions
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

    // 7. Upsert standings in MongoDB
    const savedStandings: StandingDocument[] = [];
    for (const standing of standings) {
      const doc = await StandingModel.findOneAndUpdate(
        {
          competitionId,
          seasonId,
          racerId: standing.racerId,
        },
        {
          $set: {
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

    // Remove standings for racers no longer in the competition
    const currentRacerIds = standings.map((s) => s.racerId);
    await StandingModel.deleteMany({
      competitionId,
      seasonId,
      racerId: { $nin: currentRacerIds },
    });

    // 8. Insert standings history snapshot into TimescaleDB
    await this.insertStandingsHistory(competitionId, seasonId, savedStandings);

    return savedStandings;
  }

  /**
   * Recalculate all standings for a season across all active competitions.
   * Handles both individual and team competitions.
   *
   * Requirement 6.2: Recalculate affected Standings when Race_Results are updated
   * Requirement 6.9: Recalculate team standings when membership changes
   */
  async recalculateAll(seasonId: string): Promise<void> {
    await connectMongoDB();

    // Get all active individual competitions for the season
    const individualCompetitions = await CompetitionModel.find({
      seasonId,
      isActive: true,
      type: "individual",
    });

    for (const competition of individualCompetitions) {
      await this.calculate(competition._id.toString(), seasonId);
    }

    // Get all active team competitions for the season
    const teamCompetitions = await CompetitionModel.find({
      seasonId,
      isActive: true,
      type: "team",
    });

    for (const competition of teamCompetitions) {
      await this.calculateTeam(competition._id.toString(), seasonId);
    }

    // Notify that standings have been updated so recognitions can be recomputed
    notifyStandingsUpdated(seasonId);
  }

  /**
   * Calculate team standings for a specific team-type competition in a season.
   *
   * 1. Fetch the competition (must be type 'team')
   * 2. Get all team-type organizations
   * 3. For each team:
   *    a. Get all member person IDs from the organization
   *    b. Fetch all race results for those members in the season
   *    c. Check eligibility of each result against the competition
   *    d. Aggregate points using the competition's scoring method (sum all member points)
   * 4. Sort teams by totalPoints descending and assign positions
   * 5. Upsert team standings in MongoDB (TeamStandingModel)
   * 6. Insert team standings history into TimescaleDB (team_standings_history table)
   *
   * Requirement 6.6: Compute Team_Standings by aggregating Race_Results of team members
   * Requirement 6.7: Include Race_Result in Team_Standing for the racer's team
   * Requirement 6.17: Compute Team Championship Standings by aggregating all member results
   */
  async calculateTeam(
    competitionId: string,
    seasonId: string
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

    // 2. Get all team-type organizations
    const teams = await OrganizationModel.find({ type: "team" });

    // 3. For each team, aggregate member results
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

      // b. Fetch all race results for team members in the season
      const raceResults = await RaceResultModel.find({
        seasonId,
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

    // 5. Upsert team standings in MongoDB
    const savedStandings: TeamStandingDocument[] = [];
    for (const standing of teamStandingsData) {
      const doc = await TeamStandingModel.findOneAndUpdate(
        {
          competitionId,
          seasonId,
          organizationId: standing.organizationId,
        },
        {
          $set: {
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

    // Remove team standings for teams no longer in the competition
    const currentOrgIds = teamStandingsData.map((t) => t.organizationId);
    await TeamStandingModel.deleteMany({
      competitionId,
      seasonId,
      organizationId: { $nin: currentOrgIds },
    });

    // 6. Insert team standings history into TimescaleDB
    await this.insertTeamStandingsHistory(competitionId, seasonId, savedStandings);

    return savedStandings;
  }

  /**
   * Insert a standings history snapshot into TimescaleDB.
   * Records the current position, total_points, and total_races for each racer.
   */
  private async insertStandingsHistory(
    competitionId: string,
    seasonId: string,
    standings: StandingDocument[]
  ): Promise<void> {
    if (standings.length === 0) return;

    const now = new Date().toISOString();

    for (const standing of standings) {
      try {
        await queryWithRetry(
          `INSERT INTO standings_history (time, person_id, competition_id, season_id, position, total_points, total_races)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            now,
            standing.racerId.toString(),
            competitionId,
            seasonId,
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
    standings: TeamStandingDocument[]
  ): Promise<void> {
    if (standings.length === 0) return;

    const now = new Date().toISOString();

    for (const standing of standings) {
      try {
        await queryWithRetry(
          `INSERT INTO team_standings_history (time, organization_id, competition_id, season_id, position, total_points)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            now,
            standing.organizationId.toString(),
            competitionId,
            seasonId,
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
 */
export function wireStandingsRecalculation(): void {
  const standingsService = new StandingsService();
  setOnResultsEnteredCallback((_raceId: string, seasonId: string) => {
    // Fire and forget - recalculate in the background
    standingsService.recalculateAll(seasonId).catch((error) => {
      console.error(
        "[StandingsService] Failed to recalculate standings:",
        error instanceof Error ? error.message : error
      );
    });
  });
}
