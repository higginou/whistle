import { createPostgresClient } from '../db/connection.js'

const TEAM_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SEASON_ID_RE = /^\d{4}-\d{4}$/
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const MAX_MATCH_SCORE = 200

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required`)

  return value.trim()
}

function assertScore(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > MAX_MATCH_SCORE) {
    throw new Error(`${field} must be an integer between 0 and ${MAX_MATCH_SCORE}`)
  }

  return value
}

function normalizeBonus(value = {}) {
  return {
    offensive: value?.offensive === true,
    defensive: value?.defensive === true,
  }
}

export function normalizeAdminMatchPayload(payload = {}) {
  const seasonId = assertString(payload.seasonId, 'seasonId')
  const homeTeamId = assertString(payload.homeTeamId, 'homeTeamId')
  const awayTeamId = assertString(payload.awayTeamId, 'awayTeamId')
  const date = assertString(payload.date, 'date')

  if (!SEASON_ID_RE.test(seasonId)) throw new Error('seasonId must use YYYY-YYYY')
  if (!TEAM_ID_RE.test(homeTeamId) || !TEAM_ID_RE.test(awayTeamId)) throw new Error('team ids must be kebab-case')
  if (homeTeamId === awayTeamId) throw new Error('homeTeamId and awayTeamId must differ')
  if (!Number.isInteger(payload.matchday) || payload.matchday < 1 || payload.matchday > 26) {
    throw new Error('matchday must be between 1 and 26')
  }
  if (!ISO_TIMESTAMP_RE.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error('date must be an ISO-8601 UTC timestamp')
  }

  const normalizedDate = new Date(date).toISOString().replace('.000Z', 'Z')
  if (normalizedDate !== date) {
    throw new Error('date must be an ISO-8601 UTC timestamp')
  }

  const homeBonus = normalizeBonus(payload.homeBonus)
  const awayBonus = normalizeBonus(payload.awayBonus)

  return {
    seasonId,
    matchday: payload.matchday,
    date,
    homeTeamId,
    awayTeamId,
    homeScore: assertScore(payload.homeScore, 'homeScore'),
    awayScore: assertScore(payload.awayScore, 'awayScore'),
    homeBonus,
    awayBonus,
    status: 'played',
  }
}

export async function saveAdminMatch(match, sql) {
  const homeBonus = normalizeBonus(match.homeBonus)
  const awayBonus = normalizeBonus(match.awayBonus)

  return sql`
    INSERT INTO matches (
      season_id,
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
      status,
      source,
      updated_at
    ) VALUES (
      ${match.seasonId},
      ${match.matchday},
      ${match.date},
      ${match.homeTeamId},
      ${match.awayTeamId},
      ${match.homeScore},
      ${match.awayScore},
      ${homeBonus.offensive},
      ${homeBonus.defensive},
      ${awayBonus.offensive},
      ${awayBonus.defensive},
      ${match.status},
      'admin',
      NOW()
    )
    ON CONFLICT (season_id, matchday, home_team_id, away_team_id)
    DO UPDATE SET
      date = EXCLUDED.date,
      home_score = EXCLUDED.home_score,
      away_score = EXCLUDED.away_score,
      home_bonus_offensive = EXCLUDED.home_bonus_offensive,
      home_bonus_defensive = EXCLUDED.home_bonus_defensive,
      away_bonus_offensive = EXCLUDED.away_bonus_offensive,
      away_bonus_defensive = EXCLUDED.away_bonus_defensive,
      status = EXCLUDED.status,
      source = EXCLUDED.source,
      updated_at = NOW()
    RETURNING id
  `
}

export function getAdminSql(env = process.env, sql) {
  return sql ?? createPostgresClient(env)
}
