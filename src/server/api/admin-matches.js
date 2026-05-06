import { createPostgresClient } from '../db/connection.js'

const TEAM_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SEASON_ID_RE = /^\d{4}-\d{4}$/
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const MAX_MATCH_SCORE = 200
const MAX_MATCH_TRIES = 50

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

function assertTries(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > MAX_MATCH_TRIES) {
    throw new Error(`${field} must be an integer between 0 and ${MAX_MATCH_TRIES}`)
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
    homeTries: assertTries(payload.homeTries, 'homeTries'),
    awayTries: assertTries(payload.awayTries, 'awayTries'),
    homeBonus,
    awayBonus,
    status: 'played',
  }
}

export async function saveAdminMatch(match, sql) {
  const homeBonus = normalizeBonus(match.homeBonus)
  const awayBonus = normalizeBonus(match.awayBonus)

  const updatedRows = await sql`
    UPDATE matches
    SET
      date = ${match.date},
      home_score = ${match.homeScore},
      away_score = ${match.awayScore},
      home_tries = ${match.homeTries},
      away_tries = ${match.awayTries},
      home_bonus_offensive = ${homeBonus.offensive},
      home_bonus_defensive = ${homeBonus.defensive},
      away_bonus_offensive = ${awayBonus.offensive},
      away_bonus_defensive = ${awayBonus.defensive},
      status = ${match.status},
      source = 'admin',
      updated_at = NOW()
    WHERE season_id = ${match.seasonId}
      AND matchday = ${match.matchday}
      AND home_team_id = ${match.homeTeamId}
      AND away_team_id = ${match.awayTeamId}
    RETURNING id
  `

  if (updatedRows.length > 0) return updatedRows

  return sql`
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
      ${match.homeTries},
      ${match.awayTries},
      ${homeBonus.offensive},
      ${homeBonus.defensive},
      ${awayBonus.offensive},
      ${awayBonus.defensive},
      ${match.status},
      'admin',
      NOW()
    )
    RETURNING id
  `
}

export function getAdminSql(env = process.env, sql) {
  return sql ?? createPostgresClient(env)
}
