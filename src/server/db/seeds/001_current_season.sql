BEGIN;

UPDATE seasons
SET is_current = FALSE,
    updated_at = NOW()
WHERE id <> '2025-2026'
  AND is_current = TRUE;

INSERT INTO seasons (id, label, starts_on, ends_on, is_current)
VALUES ('2025-2026', 'Saison 2025-2026', '2025-09-01', '2026-06-30', TRUE)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  starts_on = EXCLUDED.starts_on,
  ends_on = EXCLUDED.ends_on,
  is_current = EXCLUDED.is_current,
  updated_at = NOW();

COMMIT;
