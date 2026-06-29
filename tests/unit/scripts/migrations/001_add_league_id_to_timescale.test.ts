/**
 * Unit tests for the TimescaleDB migration that adds league_id columns.
 * Validates that the migration SQL contains the expected ALTER TABLE statements
 * and index definitions for multi-league support.
 *
 * Requirements: 5.2, 5.7
 */

import * as fs from "fs";
import * as path from "path";

describe("001_add_league_id_to_timescale migration SQL", () => {
  const migrationPath = path.resolve(
    __dirname,
    "../../../../scripts/migrations/001_add_league_id_to_timescale.sql"
  );

  let sql: string;

  beforeAll(() => {
    sql = fs.readFileSync(migrationPath, "utf-8");
  });

  describe("standings_history", () => {
    it("should add league_id column with NOT NULL DEFAULT 'default'", () => {
      expect(sql).toMatch(
        /ALTER TABLE standings_history[\s\S]*?league_id\s+TEXT\s+NOT NULL\s+DEFAULT\s+'default'/
      );
    });

    it("should create idx_standings_league index on (league_id, person_id, competition_id, time DESC)", () => {
      expect(sql).toContain("idx_standings_league");
      expect(sql).toMatch(
        /ON\s+standings_history\s*\(league_id,\s*person_id,\s*competition_id,\s*time\s+DESC\)/
      );
    });
  });

  describe("team_standings_history", () => {
    it("should add league_id column with NOT NULL DEFAULT 'default'", () => {
      expect(sql).toMatch(
        /ALTER TABLE team_standings_history[\s\S]*?league_id\s+TEXT\s+NOT NULL\s+DEFAULT\s+'default'/
      );
    });

    it("should create idx_team_standings_league index on (league_id, organization_id, competition_id, time DESC)", () => {
      expect(sql).toContain("idx_team_standings_league");
      expect(sql).toMatch(
        /ON\s+team_standings_history\s*\(league_id,\s*organization_id,\s*competition_id,\s*time\s+DESC\)/
      );
    });
  });

  describe("race_performance", () => {
    it("should add league_id column with NOT NULL DEFAULT 'default'", () => {
      expect(sql).toMatch(
        /ALTER TABLE race_performance[\s\S]*?league_id\s+TEXT\s+NOT NULL\s+DEFAULT\s+'default'/
      );
    });

    it("should create idx_perf_league index on (league_id, person_id, time DESC)", () => {
      expect(sql).toContain("idx_perf_league");
      expect(sql).toMatch(
        /ON\s+race_performance\s*\(league_id,\s*person_id,\s*time\s+DESC\)/
      );
    });
  });
});
