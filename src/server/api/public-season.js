import { createPostgresClient } from '../db/connection.js'

const SEASON_ID_RE = /^\d{4}-\d{4}$/

export function normalizeSeasonId(season = '2025-2026') {
  if (typeof season !== 'string' || !SEASON_ID_RE.test(season)) throw new Error('invalid-season')

  return season
}

export async function getPublicSeasonPayload(seasonId, sql) {
  const rows = await sql`
    SELECT
      seasons.id AS season,
      projection_snapshots.matchday,
      projection_snapshots.generated_at,
      projection_snapshots.brier_score,
      projection_snapshots.standings
    FROM seasons
    LEFT JOIN LATERAL (
      SELECT matchday, generated_at, brier_score, standings
      FROM projection_snapshots
      WHERE season_id = seasons.id
      ORDER BY generated_at DESC
      LIMIT 1
    ) projection_snapshots ON TRUE
    WHERE seasons.id = ${seasonId}
  `

  if (rows.length === 0) throw new Error('season-not-found')
  if (!rows[0].standings) throw new Error('projection-not-found')

  return {
    ...rows[0].standings,
    season: rows[0].season,
    matchday: rows[0].matchday,
    lastUpdated: new Date(rows[0].generated_at).toISOString(),
    brierScore: rows[0].brier_score === null ? null : Number(rows[0].brier_score),
  }
}

export function getPublicSql(env = process.env, sql) {
  return sql ?? createPostgresClient(env)
}
