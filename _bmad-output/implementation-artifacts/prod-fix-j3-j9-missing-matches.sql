-- Prod data repair: restore missing played matches for TOP 14 2025-2026.
-- Sources:
-- - Rugbyrama J3: https://www.rugbyrama.fr/resultats/rugby/top-14/phase-reguliere/resultats/11605/journee-3
-- - Rugbyrama J4: https://www.rugbyrama.fr/resultats/rugby/top-14/phase-reguliere/resultats/11604/journee-4
-- - Rugbyrama J5-J9 follow the same descending result id pattern.
-- - LNR J3 confirms Toulon-La Rochelle is attached to J3 despite being played on 2025-11-08.
--
-- Run this single statement against Vercel Postgres, then run the verification
-- query from prod-verify-matchday-counts.sql.

INSERT INTO matches (
  season_id,
  matchday,
  date,
  home_team_id,
  away_team_id,
  home_score,
  away_score,
  home_tries,
  away_tries,
  home_bonus_offensive,
  home_bonus_defensive,
  away_bonus_offensive,
  away_bonus_defensive,
  status,
  source
)
VALUES
  ('2025-2026', 3, '2025-11-08T00:00:00Z', 'toulon', 'la-rochelle', 39, 14, 6, 2, TRUE, FALSE, FALSE, FALSE, 'played', 'admin-repair'),
  ('2025-2026', 4, '2025-09-27T00:00:00Z', 'stade-francais', 'bordeaux-begles', 28, 7, 3, 1, FALSE, FALSE, FALSE, FALSE, 'played', 'admin-repair'),
  ('2025-2026', 5, '2025-10-04T00:00:00Z', 'montpellier', 'la-rochelle', 37, 13, 4, 1, TRUE, FALSE, FALSE, FALSE, 'played', 'admin-repair'),
  ('2025-2026', 6, '2025-10-11T00:00:00Z', 'pau', 'bayonne', 47, 24, 6, 3, TRUE, FALSE, FALSE, FALSE, 'played', 'admin-repair'),
  ('2025-2026', 7, '2025-10-18T00:00:00Z', 'bayonne', 'clermont', 44, 17, 6, 2, TRUE, FALSE, FALSE, FALSE, 'played', 'admin-repair'),
  ('2025-2026', 8, '2025-10-25T00:00:00Z', 'lyon', 'la-rochelle', 19, 36, 3, 5, FALSE, FALSE, FALSE, FALSE, 'played', 'admin-repair'),
  ('2025-2026', 9, '2025-11-01T00:00:00Z', 'toulon', 'lyon', 54, 21, 8, 2, TRUE, FALSE, FALSE, FALSE, 'played', 'admin-repair')
ON CONFLICT (season_id, matchday, home_team_id, away_team_id) DO UPDATE SET
  date = EXCLUDED.date,
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  home_tries = EXCLUDED.home_tries,
  away_tries = EXCLUDED.away_tries,
  home_bonus_offensive = EXCLUDED.home_bonus_offensive,
  home_bonus_defensive = EXCLUDED.home_bonus_defensive,
  away_bonus_offensive = EXCLUDED.away_bonus_offensive,
  away_bonus_defensive = EXCLUDED.away_bonus_defensive,
  status = EXCLUDED.status,
  source = EXCLUDED.source,
  updated_at = NOW();
