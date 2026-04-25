import { recomputeSeasonProjection } from '../../recompute/recalculation-engine.js'
import { TOTAL_MATCHDAYS } from '../../../scripts/elo.js'
import { createPostgresClient } from '../db/connection.js'

const SEASON_ID_RE = /^\d{4}-\d{4}$/
const TOP14_TEAM_COUNT = 14

function normalizeSeasonId(seasonId) {
  if (typeof seasonId !== 'string' || !SEASON_ID_RE.test(seasonId)) throw new Error('invalid-season')

  return seasonId
}

function toTimestamp(value) {
  if (typeof value === 'string' && value.trim() !== '') return value

  return new Date().toISOString().replace('.000Z', 'Z')
}

function deriveTeams(matches) {
  const ids = new Set()
  for (const match of matches) {
    ids.add(match.home_team_id)
    ids.add(match.away_team_id)
  }

  return [...ids].sort().map((id) => ({ id, name: id }))
}

function deriveMatchday(matches) {
  const playedMatchdays = matches
    .filter((match) => match.status === 'played')
    .map((match) => match.matchday)

  if (playedMatchdays.length === 0) throw new Error('no-played-matches')

  return Math.max(...playedMatchdays)
}

function assertCalendarComplete({ matchday, expectedTeamCount, calendar }) {
  if (matchday >= TOTAL_MATCHDAYS) return

  const expectedRemainingMatches = ((TOTAL_MATCHDAYS - matchday) * expectedTeamCount) / 2
  if (calendar.length < expectedRemainingMatches) throw new Error('missing-calendar')
}

export async function loadSeasonMatches(seasonId, sql) {
  return sql`
    SELECT
      matchday,
      date,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      home_bonus_offensive,
      home_bonus_defensive,
      away_bonus_offensive,
      away_bonus_defensive,
      status
    FROM matches
    WHERE season_id = ${seasonId}
    ORDER BY matchday ASC, date ASC, home_team_id ASC
  `
}

export async function loadLatestProjectionHistory(seasonId, sql) {
  const rows = await sql`
    SELECT standings
    FROM projection_snapshots
    WHERE season_id = ${seasonId}
    ORDER BY generated_at DESC
    LIMIT 1
  `

  return Array.isArray(rows[0]?.standings?.predictions) ? rows[0].standings.predictions : []
}

export async function persistProjectionSnapshot({ seasonId, payload, generatedAt }, sql) {
  const rows = await sql`
    INSERT INTO projection_snapshots (
      season_id,
      matchday,
      generated_at,
      model_version,
      brier_score,
      standings,
      source
    ) VALUES (
      ${seasonId},
      ${payload.matchday},
      ${generatedAt},
      ${payload.modelVersion},
      ${payload.brierScore},
      ${payload},
      'recalculation'
    )
    RETURNING id
  `

  return rows[0]?.id ?? null
}

export async function recomputeAndPersistSeason(options, sql) {
  const seasonId = normalizeSeasonId(options.seasonId)
  const generatedAt = toTimestamp(options.generatedAt)
  const matches = await loadSeasonMatches(seasonId, sql)
  if (matches.length === 0) throw new Error('season-has-no-matches')
  const matchday = deriveMatchday(matches)
  const calendar = matches.filter((match) => match.status !== 'played')
  const teams = deriveTeams(matches)
  assertCalendarComplete({ matchday, expectedTeamCount: options.expectedTeamCount ?? TOP14_TEAM_COUNT, calendar })

  const payload = recomputeSeasonProjection({
    seasonId,
    matchday,
    teams,
    matches,
    calendar,
    generatedAt,
    seed: options.seed,
    numSimulations: options.numSimulations,
  })
  const previousPredictions = await loadLatestProjectionHistory(seasonId, sql)
  payload.predictions = [...previousPredictions, ...payload.predictions]
  const snapshotId = await persistProjectionSnapshot({ seasonId, payload, generatedAt }, sql)

  return { snapshotId, payload }
}

export function getRecomputeSql(env = process.env, sql) {
  return sql ?? createPostgresClient(env)
}
