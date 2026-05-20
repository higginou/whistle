-- Prod data repair: align TOP 14 bonus flags with the official J24 standings.
--
-- This fixes:
-- - defensive bonus rule: TOP 14 is defeat by 5 points or fewer, not 7;
-- - missing defensive bonuses on rows where tries were unavailable;
-- - missing offensive bonuses on large wins where tries were unavailable;
-- - one Toulouse offensive bonus flag that makes the public total 83 instead of the official 82.
--
-- Run this against Vercel Postgres, then launch POST /api/admin/recompute.

BEGIN;

UPDATE matches
SET away_bonus_defensive = FALSE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 24
  AND home_team_id = 'lyon'
  AND away_team_id = 'bayonne';

UPDATE matches
SET home_bonus_defensive = TRUE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 9
  AND home_team_id = 'montpellier'
  AND away_team_id = 'clermont';

UPDATE matches
SET away_bonus_offensive = TRUE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 10
  AND home_team_id = 'perpignan'
  AND away_team_id = 'montpellier';

UPDATE matches
SET home_bonus_defensive = TRUE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 17
  AND home_team_id = 'stade-francais'
  AND away_team_id = 'toulouse';

UPDATE matches
SET away_bonus_defensive = TRUE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 8
  AND home_team_id = 'racing-92'
  AND away_team_id = 'pau';

UPDATE matches
SET home_bonus_offensive = TRUE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 4
  AND home_team_id = 'pau'
  AND away_team_id = 'lyon';

UPDATE matches
SET away_bonus_defensive = TRUE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 2
  AND home_team_id = 'toulon'
  AND away_team_id = 'castres';

UPDATE matches
SET home_bonus_offensive = TRUE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 9
  AND home_team_id = 'la-rochelle'
  AND away_team_id = 'racing-92';

UPDATE matches
SET home_bonus_offensive = TRUE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 14
  AND home_team_id = 'la-rochelle'
  AND away_team_id = 'toulon';

UPDATE matches
SET away_bonus_offensive = FALSE,
    source = 'admin-repair',
    updated_at = NOW()
WHERE season_id = '2025-2026'
  AND matchday = 23
  AND home_team_id = 'toulon'
  AND away_team_id = 'toulouse';

COMMIT;

SELECT team_id, SUM(points)::int AS points
FROM (
  SELECT home_team_id AS team_id,
    CASE
      WHEN home_score > away_score THEN 4
      WHEN home_score = away_score THEN 2
      ELSE 0
    END
    + CASE WHEN home_bonus_offensive THEN 1 ELSE 0 END
    + CASE WHEN home_bonus_defensive THEN 1 ELSE 0 END AS points
  FROM matches
  WHERE season_id = '2025-2026'
    AND status = 'played'
  UNION ALL
  SELECT away_team_id AS team_id,
    CASE
      WHEN away_score > home_score THEN 4
      WHEN away_score = home_score THEN 2
      ELSE 0
    END
    + CASE WHEN away_bonus_offensive THEN 1 ELSE 0 END
    + CASE WHEN away_bonus_defensive THEN 1 ELSE 0 END AS points
  FROM matches
  WHERE season_id = '2025-2026'
    AND status = 'played'
) points_by_match
GROUP BY team_id
ORDER BY points DESC, team_id ASC;
