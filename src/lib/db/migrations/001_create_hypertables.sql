-- Migration: 001_create_hypertables
-- Creates TimescaleDB hypertables for time-series analytics data:
-- standings_history, team_standings_history, race_performance
--
-- Requirements: 6.1, 6.2, 17.2, 17.3

-- Enable TimescaleDB extension if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- standings_history: tracks individual standings over time for trend analysis
CREATE TABLE IF NOT EXISTS standings_history (
  time           TIMESTAMPTZ NOT NULL,
  person_id      TEXT NOT NULL,
  competition_id TEXT NOT NULL,
  season_id      TEXT NOT NULL,
  position       INTEGER NOT NULL,
  total_points   NUMERIC NOT NULL,
  total_races    INTEGER NOT NULL
);

SELECT create_hypertable('standings_history', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_standings_person
  ON standings_history (person_id, competition_id, time DESC);

-- team_standings_history: tracks team standings over time
CREATE TABLE IF NOT EXISTS team_standings_history (
  time            TIMESTAMPTZ NOT NULL,
  organization_id TEXT NOT NULL,
  competition_id  TEXT NOT NULL,
  season_id       TEXT NOT NULL,
  position        INTEGER NOT NULL,
  total_points    NUMERIC NOT NULL
);

SELECT create_hypertable('team_standings_history', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_team_standings_org
  ON team_standings_history (organization_id, competition_id, time DESC);

-- race_performance: tracks individual race performance for analytics and computed recognitions
CREATE TABLE IF NOT EXISTS race_performance (
  time        TIMESTAMPTZ NOT NULL,
  person_id   TEXT NOT NULL,
  race_id     TEXT NOT NULL,
  season_id   TEXT NOT NULL,
  category    TEXT NOT NULL,
  position    INTEGER NOT NULL,
  finish_time BIGINT NOT NULL,
  points      NUMERIC
);

SELECT create_hypertable('race_performance', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_perf_person
  ON race_performance (person_id, time DESC);
