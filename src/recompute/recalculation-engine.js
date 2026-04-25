import {
  INITIAL_ELO,
  NUM_SIMULATIONS,
  TOTAL_MATCHDAYS,
  applyTiebreaker,
  buildHeadToHeadOutput,
  calculateConfidence,
  calculateMatchDifficulty,
  computeEloRatings,
  computeForm,
  computeHeadToHead,
  computeNeighborGap,
  computeProjectedRank,
  computeResultBonuses,
  computeTrend,
  computeZoneProbabilities,
  median,
  roundDecimal,
  simulateSeason,
} from '../../scripts/elo.js'

export const RECOMPUTE_MODEL_VERSION = 'recompute-v1'

function createSeededRandom(seed = 1) {
  let state = seed >>> 0

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0

    return state / 0x100000000
  }
}

function normalizeMatch(match) {
  const homeTeamId = match.homeTeamId ?? match.home_team_id ?? match.home
  const awayTeamId = match.awayTeamId ?? match.away_team_id ?? match.away
  const homeScore = match.homeScore ?? match.home_score
  const awayScore = match.awayScore ?? match.away_score

  if (typeof homeTeamId !== 'string' || typeof awayTeamId !== 'string') throw new Error('match team ids are required')
  if (!Number.isInteger(match.matchday)) throw new Error('matchday is required')
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) throw new Error('played match scores are required')

  return {
    matchday: match.matchday,
    date: match.date,
    home: homeTeamId,
    away: awayTeamId,
    homeScore,
    awayScore,
    homeBonus: match.homeBonus ?? null,
    awayBonus: match.awayBonus ?? null,
  }
}

function normalizeCalendarMatch(match) {
  const homeTeamId = match.homeTeamId ?? match.home_team_id ?? match.home
  const awayTeamId = match.awayTeamId ?? match.away_team_id ?? match.away

  if (typeof homeTeamId !== 'string' || typeof awayTeamId !== 'string') throw new Error('calendar team ids are required')
  if (!Number.isInteger(match.matchday)) throw new Error('calendar matchday is required')

  return {
    matchday: match.matchday,
    date: match.date,
    home: homeTeamId,
    away: awayTeamId,
  }
}

function isPlayedMatch(match) {
  if (match.status === 'played') return true
  if (match.status != null) return false

  return (match.homeScore ?? match.home_score) != null && (match.awayScore ?? match.away_score) != null
}

function buildStandings(teams, results, elos) {
  const realPoints = computeResultBonuses(results)

  return teams
    .map((team) => ({
      id: team.id,
      name: team.name,
      rank: 0,
      points: realPoints.get(team.id) ?? 0,
      elo: elos.get(team.id) ?? INITIAL_ELO,
    }))
    .sort((a, b) => b.points - a.points || b.elo - a.elo || a.id.localeCompare(b.id))
    .map((team, index) => ({ ...team, rank: index + 1 }))
}

function requireArray(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`)

  return value
}

export function recomputeSeasonProjection({
  seasonId,
  matchday,
  teams,
  matches,
  calendar,
  generatedAt,
  seed = 1,
  numSimulations = NUM_SIMULATIONS,
  modelVersion = RECOMPUTE_MODEL_VERSION,
}) {
  if (typeof seasonId !== 'string' || seasonId.trim() === '') throw new Error('seasonId is required')
  if (!Number.isInteger(matchday) || matchday < 1 || matchday > TOTAL_MATCHDAYS) {
    throw new Error(`matchday must be between 1 and ${TOTAL_MATCHDAYS}`)
  }
  if (typeof generatedAt !== 'string' || generatedAt.trim() === '') throw new Error('generatedAt is required')
  if (!Number.isInteger(numSimulations) || numSimulations < 1) throw new Error('numSimulations must be positive')

  const teamInputs = requireArray(teams, 'teams').map((team) => {
    if (typeof team.id !== 'string' || team.id.trim() === '') throw new Error('team id is required')

    return { ...team }
  })
  const results = requireArray(matches, 'matches').filter(isPlayedMatch).map(normalizeMatch)
  const calendarInput = requireArray(calendar, 'calendar').map(normalizeCalendarMatch)
  const initialStandings = teamInputs.map((team, index) => ({
    id: team.id,
    name: team.name,
    rank: index + 1,
    points: 0,
  }))

  const realPoints = computeResultBonuses(results)
  const { elos, eloHistories } = computeEloRatings(initialStandings, results)
  const standings = buildStandings(teamInputs, results, elos)
  const h2hMap = computeHeadToHead(results)
  const rng = createSeededRandom(seed)
  const { rankCounts, pointTotals } = simulateSeason(elos, calendarInput, numSimulations, rng, realPoints)
  const sortedByElo = [...elos.entries()]
    .map(([id, elo]) => ({ id, elo }))
    .sort((a, b) => b.elo - a.elo || a.id.localeCompare(b.id))

  const outputTeams = standings.map((standing) => {
    const elo = elos.get(standing.id) ?? INITIAL_ELO
    const history = eloHistories.get(standing.id) ?? [INITIAL_ELO]
    const distribution = rankCounts.get(standing.id) ?? new Array(teamInputs.length).fill(0)
    const zones = computeZoneProbabilities(distribution, numSimulations)
    const teamIndex = sortedByElo.findIndex((team) => team.id === standing.id)
    const neighborGap = computeNeighborGap(sortedByElo, teamIndex)
    const projectedPointSamples = pointTotals.get(standing.id) ?? []

    return {
      id: standing.id,
      name: standing.name,
      currentRank: standing.rank,
      points: standing.points,
      elo,
      projectedRank: computeProjectedRank(distribution, numSimulations),
      projectedPoints: projectedPointSamples.length > 0 ? median(projectedPointSamples) : standing.points,
      confidence: roundDecimal(calculateConfidence(matchday, TOTAL_MATCHDAYS, neighborGap), 2),
      zones: {
        europe: roundDecimal(zones.europe, 4),
        top6: roundDecimal(zones.top6, 4),
        mid: roundDecimal(zones.mid, 4),
        relegation: roundDecimal(zones.relegation, 4),
      },
      form: computeForm(standing.id, results),
      trend: computeTrend(history),
      eloHistory: history,
    }
  })

  const tiebreakerMap = applyTiebreaker(outputTeams, standings, h2hMap)
  outputTeams.sort((a, b) => a.currentRank - b.currentRank || a.id.localeCompare(b.id))
  for (let i = 0; i < outputTeams.length; i++) {
    outputTeams[i].currentRank = i + 1
    const groupId = tiebreakerMap.get(outputTeams[i].id)
    if (groupId != null) outputTeams[i].tiebreaker = `h2h-${groupId}`
  }

  const calendarOutput = calendarInput.map((match) => {
    const homeElo = elos.get(match.home) ?? INITIAL_ELO
    const awayElo = elos.get(match.away) ?? INITIAL_ELO

    return {
      matchday: match.matchday,
      date: match.date,
      home: match.home,
      away: match.away,
      difficulty: roundDecimal(calculateMatchDifficulty(homeElo, awayElo, true), 2),
    }
  })

  return {
    season: seasonId,
    matchday,
    lastUpdated: generatedAt,
    modelVersion,
    brierScore: null,
    teams: outputTeams,
    calendar: calendarOutput,
    predictions: [
      {
        matchday,
        date: generatedAt,
        projections: outputTeams.map((team) => ({
          teamId: team.id,
          projectedRank: team.projectedRank,
          confidence: team.confidence,
        })),
      },
    ],
    headToHead: buildHeadToHeadOutput(h2hMap, results),
  }
}
