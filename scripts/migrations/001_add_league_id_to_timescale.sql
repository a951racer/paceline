-- Migration: 001_add_league_id_to_timescale
-- Adds league_id column to all TimescaleDB hypertables for multi-league support.
-- The DEFAULT 'default' ensures existing rows are assigned to the default league.
--
-- Requirements: 5.2, 5.7

-- Add league_id to standings_history
ALTER TABLE standings_history
  ADD COLUMN IF NOT EXISTS league_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_standings_league
  ON standings_history (league_id, person_id, competition_id, time DESC);

-- Add league_id to team_standings_history
ALTER TABLE team_standings_history
  ADD COLUMN IF NOT EXISTS league_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_team_standings_league
  ON team_standings_history (league_id, organization_id, competition_id, time DESC);

-- Add league_id to race_performance
ALTER TABLE race_performance
  ADD COLUMN IF NOT EXISTS league_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_perf_league
  ON race_performance (league_id, person_id, time DESC);
