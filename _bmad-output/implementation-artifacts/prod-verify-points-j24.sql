-- Verification query: run after prod-fix-bonus-points-j24.sql and recompute.

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
