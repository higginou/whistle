CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_on < ends_on)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_one_current
  ON seasons (is_current)
  WHERE is_current = TRUE;

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id TEXT NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  matchday SMALLINT NOT NULL CHECK (matchday BETWEEN 1 AND 26),
  date TIMESTAMPTZ NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_score SMALLINT CHECK (home_score >= 0),
  away_score SMALLINT CHECK (away_score >= 0),
  home_tries SMALLINT,
  away_tries SMALLINT,
  home_bonus_offensive BOOLEAN NOT NULL DEFAULT FALSE,
  home_bonus_defensive BOOLEAN NOT NULL DEFAULT FALSE,
  away_bonus_offensive BOOLEAN NOT NULL DEFAULT FALSE,
  away_bonus_defensive BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'played', 'postponed', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (home_team_id <> away_team_id),
  CONSTRAINT matches_home_tries_range CHECK (home_tries IS NULL OR (home_tries >= 0 AND home_tries <= 50)),
  CONSTRAINT matches_away_tries_range CHECK (away_tries IS NULL OR (away_tries >= 0 AND away_tries <= 50)),
  CHECK (
    (status = 'played' AND home_score IS NOT NULL AND away_score IS NOT NULL)
    OR (status <> 'played' AND home_score IS NULL AND away_score IS NULL)
  ),
  UNIQUE (season_id, matchday, home_team_id, away_team_id)
);

CREATE OR REPLACE FUNCTION prevent_team_double_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM matches existing
    WHERE existing.season_id = NEW.season_id
      AND existing.matchday = NEW.matchday
      AND existing.id <> NEW.id
      AND (
        existing.home_team_id IN (NEW.home_team_id, NEW.away_team_id)
        OR existing.away_team_id IN (NEW.home_team_id, NEW.away_team_id)
      )
  ) THEN
    RAISE EXCEPTION 'team already has a match for this season and matchday';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_team_double_booking ON matches;
CREATE TRIGGER trg_prevent_team_double_booking
  BEFORE INSERT OR UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION prevent_team_double_booking();

CREATE INDEX IF NOT EXISTS idx_matches_season_matchday
  ON matches (season_id, matchday, date);

CREATE TABLE IF NOT EXISTS projection_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id TEXT NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  matchday SMALLINT NOT NULL CHECK (matchday BETWEEN 1 AND 26),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version TEXT NOT NULL,
  brier_score NUMERIC(6, 5) CHECK (brier_score IS NULL OR (brier_score >= 0 AND brier_score <= 1)),
  standings JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'recalculation',
  CHECK (jsonb_typeof(standings) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_projection_snapshots_season_generated
  ON projection_snapshots (season_id, generated_at DESC);

CREATE OR REPLACE FUNCTION prevent_projection_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'projection_snapshots is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projection_snapshots_append_only ON projection_snapshots;
CREATE TRIGGER trg_projection_snapshots_append_only
  BEFORE UPDATE OR DELETE ON projection_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION prevent_projection_snapshot_mutation();

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  season_id TEXT REFERENCES seasons (id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_log_season_time
  ON audit_log (season_id, occurred_at DESC);
