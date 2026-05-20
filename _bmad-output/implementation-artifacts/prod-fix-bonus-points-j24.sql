-- Prod data repair: align TOP 14 bonus flags with the official J24 standings.
--
-- This fixes:
-- - defensive bonus rule: TOP 14 is defeat by 5 points or fewer, not 7;
-- - missing defensive bonuses on rows where tries were unavailable;
-- - missing offensive bonuses on large wins where tries were unavailable;
-- - one Toulouse offensive bonus flag that makes the public total 83 instead of the official 82.
--
-- Run this single statement against Vercel Postgres, then run the verification
-- query from prod-verify-points-j24.sql.

UPDATE matches
SET home_bonus_offensive = patch.home_bonus_offensive,
    home_bonus_defensive = patch.home_bonus_defensive,
    away_bonus_offensive = patch.away_bonus_offensive,
    away_bonus_defensive = patch.away_bonus_defensive,
    source = 'admin-repair',
    updated_at = NOW()
FROM (
  VALUES
    (24, 'lyon', 'bayonne', FALSE, FALSE, FALSE, FALSE),
    (9, 'montpellier', 'clermont', FALSE, TRUE, FALSE, FALSE),
    (10, 'perpignan', 'montpellier', FALSE, FALSE, TRUE, FALSE),
    (17, 'stade-francais', 'toulouse', FALSE, TRUE, FALSE, FALSE),
    (8, 'racing-92', 'pau', FALSE, FALSE, FALSE, TRUE),
    (4, 'pau', 'lyon', TRUE, FALSE, FALSE, FALSE),
    (2, 'toulon', 'castres', FALSE, FALSE, FALSE, TRUE),
    (9, 'la-rochelle', 'racing-92', TRUE, FALSE, FALSE, FALSE),
    (14, 'la-rochelle', 'toulon', TRUE, FALSE, FALSE, FALSE),
    (23, 'toulon', 'toulouse', FALSE, FALSE, FALSE, FALSE)
) AS patch(
  matchday,
  home_team_id,
  away_team_id,
  home_bonus_offensive,
  home_bonus_defensive,
  away_bonus_offensive,
  away_bonus_defensive
)
WHERE matches.season_id = '2025-2026'
  AND matches.matchday = patch.matchday
  AND matches.home_team_id = patch.home_team_id
  AND matches.away_team_id = patch.away_team_id;
