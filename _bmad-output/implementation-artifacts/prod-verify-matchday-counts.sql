-- Verification query: run after prod-fix-j3-j9-missing-matches.sql.

SELECT matchday, COUNT(*) AS played_count
FROM matches
WHERE season_id = '2025-2026'
  AND status = 'played'
GROUP BY matchday
ORDER BY matchday;
