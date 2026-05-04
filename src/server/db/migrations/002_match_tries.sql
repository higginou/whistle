ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_tries SMALLINT,
  ADD COLUMN IF NOT EXISTS away_tries SMALLINT;

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_home_tries_range,
  ADD CONSTRAINT matches_home_tries_range CHECK (home_tries IS NULL OR (home_tries >= 0 AND home_tries <= 50)) NOT VALID;

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_away_tries_range,
  ADD CONSTRAINT matches_away_tries_range CHECK (away_tries IS NULL OR (away_tries >= 0 AND away_tries <= 50)) NOT VALID;
