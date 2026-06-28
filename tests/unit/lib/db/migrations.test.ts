/**
 * Unit tests for the TimescaleDB migration SQL file.
 * Validates that the migration SQL is well-formed and contains
 * the expected table definitions, hypertable creation, and indexes.
 */

import * as fs from "fs";
import * as path from "path";

describe("001_create_hypertables migration SQL", () => {
  const migrationPath = path.resolve(
    __dirname,
    "../../../../src/lib/db/migrations/001_create_hypertables.sql"
  );

  let sql: string;

  beforeAll(() => {
    sql = fs.readFileSync(migrationPath, "utf-8");
  });

  it("should enable the timescaledb extension", () => {
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS timescaledb");
  });

  describe("standings_history table", () => {
    it("should create the standings_history table", () => {
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS standings_history");
    });

    it("should have time column as TIMESTAMPTZ NOT NULL", () => {
      expect(sql).toMatch(/time\s+TIMESTAMPTZ\s+NOT NULL/);
    });

    it("should have person_id column", () => {
      expect(sql).toMatch(/person_id\s+TEXT\s+NOT NULL/);
    });

    it("should have competition_id column", () => {
      expect(sql).toMatch(/competition_id\s+TEXT\s+NOT NULL/);
    });

    it("should have season_id column", () => {
      expect(sql).toMatch(/season_id\s+TEXT\s+NOT NULL/);
    });

    it("should have position column as INTEGER", () => {
      expect(sql).toMatch(/position\s+INTEGER\s+NOT NULL/);
    });

    it("should have total_points column as NUMERIC", () => {
      expect(sql).toMatch(/total_points\s+NUMERIC\s+NOT NULL/);
    });

    it("should have total_races column as INTEGER", () => {
      expect(sql).toMatch(/total_races\s+INTEGER\s+NOT NULL/);
    });

    it("should create hypertable on time column", () => {
      expect(sql).toContain(
        "create_hypertable('standings_history', 'time'"
      );
    });

    it("should create composite index on person_id, competition_id, time DESC", () => {
      expect(sql).toContain("idx_standings_person");
      expect(sql).toMatch(
        /ON\s+standings_history\s*\(person_id,\s*competition_id,\s*time\s+DESC\)/
      );
    });
  });

  describe("team_standings_history table", () => {
    it("should create the team_standings_history table", () => {
      expect(sql).toContain(
        "CREATE TABLE IF NOT EXISTS team_standings_history"
      );
    });

    it("should have organization_id column", () => {
      expect(sql).toMatch(/organization_id\s+TEXT\s+NOT NULL/);
    });

    it("should have competition_id column", () => {
      // Both tables have competition_id, check within context
      expect(sql).toContain("competition_id  TEXT NOT NULL");
    });

    it("should have total_points column", () => {
      expect(sql).toMatch(/total_points\s+NUMERIC\s+NOT NULL/);
    });

    it("should create hypertable on time column", () => {
      expect(sql).toContain(
        "create_hypertable('team_standings_history', 'time'"
      );
    });
  });

  describe("race_performance table", () => {
    it("should create the race_performance table", () => {
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS race_performance");
    });

    it("should have person_id column", () => {
      expect(sql).toMatch(/person_id\s+TEXT\s+NOT NULL/);
    });

    it("should have race_id column", () => {
      expect(sql).toMatch(/race_id\s+TEXT\s+NOT NULL/);
    });

    it("should have season_id column", () => {
      expect(sql).toMatch(/season_id\s+TEXT\s+NOT NULL/);
    });

    it("should have category column", () => {
      expect(sql).toMatch(/category\s+TEXT\s+NOT NULL/);
    });

    it("should have finish_time column as BIGINT", () => {
      expect(sql).toMatch(/finish_time\s+BIGINT\s+NOT NULL/);
    });

    it("should have points column as NUMERIC (nullable)", () => {
      // points is nullable (no NOT NULL constraint)
      expect(sql).toMatch(/points\s+NUMERIC/);
    });

    it("should create hypertable on time column", () => {
      expect(sql).toContain(
        "create_hypertable('race_performance', 'time'"
      );
    });

    it("should create index on person_id, time DESC", () => {
      expect(sql).toContain("idx_perf_person");
      expect(sql).toMatch(
        /ON\s+race_performance\s*\(person_id,\s*time\s+DESC\)/
      );
    });
  });
});
