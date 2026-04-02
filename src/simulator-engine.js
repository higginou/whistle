/**
 * @module simulator-engine — Frontend Elo recalculation for what-if scenarios.
 *
 * Reimplements the core logic from scripts/elo.js for browser use.
 * Does NOT import scripts/elo.js (Node.js module with fs/path).
 */

// ─── Model Constants (identical to scripts/elo.js) ────────────────────────

export const INITIAL_ELO = 1500
export const K_FACTOR = 30
export const HOME_ADVANTAGE = 65
export const MARGIN_FACTOR = 0.006
export const NUM_SIMULATIONS = 10000

// ─── Elo Calculation Functions ────────────────────────────────────────────

/**
 * Expected score (win probability) for team A against team B.
 * @param {number} eloA
 * @param {number} eloB
 * @returns {number} between 0 and 1
 */
export function calculateExpectedScore(eloA, eloB) {
  return 1 / (1 + 10 ** ((eloB - eloA) / 400))
}

/**
 * Elo change after a match, incorporating margin of victory and home advantage.
 * @param {{ homeScore: number, awayScore: number, eloHome: number, eloAway: number }} params
 * @returns {{ homeChange: number, awayChange: number }}
 */
export function calculateEloChange({ homeScore, awayScore, eloHome, eloAway }) {
  let homeResult
  if (homeScore > awayScore) homeResult = 1
  else if (homeScore === awayScore) homeResult = 0.5
  else homeResult = 0

  const expectedHome = calculateExpectedScore(eloHome + HOME_ADVANTAGE, eloAway)
  const margin = Math.abs(homeScore - awayScore)
  const marginMultiplier = 1 + MARGIN_FACTOR * margin

  const homeChange = K_FACTOR * marginMultiplier * (homeResult - expectedHome)
  const awayChange = -homeChange

  return { homeChange, awayChange }
}

// ─── Monte Carlo Simulation ──────────────────────────────────────────────

/**
 * Simulate a single match outcome based on Elo ratings.
 * @param {number} eloHome
 * @param {number} eloAway
 * @param {function} [rng=Math.random]
 * @returns {{ homePoints: number, awayPoints: number, homeEloChange: number, awayEloChange: number }}
 */
export function simulateMatch(eloHome, eloAway, rng = Math.random) {
  const expectedHome = calculateExpectedScore(eloHome + HOME_ADVANTAGE, eloAway)
  const drawProb = 0.15 * (1 - Math.abs(expectedHome - 0.5) * 2)
  const homeWinProb = expectedHome * (1 - drawProb)

  const roll = rng()

  let homePoints, awayPoints, homeScore, awayScore

  if (roll < homeWinProb) {
    homePoints = 4; awayPoints = 0; homeScore = 25; awayScore = 15
  } else if (roll < homeWinProb + drawProb) {
    homePoints = 2; awayPoints = 2; homeScore = 20; awayScore = 20
  } else {
    homePoints = 0; awayPoints = 4; homeScore = 15; awayScore = 25
  }

  const { homeChange, awayChange } = calculateEloChange({
    homeScore, awayScore, eloHome, eloAway,
  })

  return { homePoints, awayPoints, homeEloChange: homeChange, awayEloChange: awayChange }
}

/**
 * Run Monte Carlo simulation of remaining season matches.
 * @param {Map<string, number>} currentElos
 * @param {object[]} calendar — remaining matches
 * @param {number} numSimulations
 * @param {function} [rng=Math.random]
 * @param {Map<string, number>} [initialPoints] — base points from simulated matches
 * @returns {{ rankCounts: Map<string, number[]> }}
 */
export function simulateSeason(currentElos, calendar, numSimulations, rng = Math.random, initialPoints = null) {
  const teamIds = [...currentElos.keys()]
  const numTeams = teamIds.length

  const rankCounts = new Map()
  for (const id of teamIds) {
    rankCounts.set(id, new Array(numTeams).fill(0))
  }

  for (let sim = 0; sim < numSimulations; sim++) {
    const simElos = new Map(currentElos)
    const simPoints = new Map()
    for (const id of teamIds) simPoints.set(id, initialPoints?.get(id) ?? 0)

    for (const match of calendar) {
      const eloHome = simElos.get(match.home)
      const eloAway = simElos.get(match.away)
      if (eloHome === undefined || eloAway === undefined) continue

      const result = simulateMatch(eloHome, eloAway, rng)
      simPoints.set(match.home, simPoints.get(match.home) + result.homePoints)
      simPoints.set(match.away, simPoints.get(match.away) + result.awayPoints)
      simElos.set(match.home, eloHome + result.homeEloChange)
      simElos.set(match.away, eloAway + result.awayEloChange)
    }

    const ranked = teamIds
      .map((id) => ({ id, points: simPoints.get(id), elo: simElos.get(id) }))
      .sort((a, b) => b.points - a.points || b.elo - a.elo)

    for (let rank = 0; rank < ranked.length; rank++) {
      rankCounts.get(ranked[rank].id)[rank]++
    }
  }

  return { rankCounts }
}

/**
 * Compute projected rank (median rank across simulations).
 * @param {number[]} rankDistribution
 * @param {number} numSimulations
 * @returns {number} 1-indexed rank
 */
export function computeProjectedRank(rankDistribution, numSimulations) {
  let cumulative = 0
  const median = numSimulations / 2

  for (let rank = 0; rank < rankDistribution.length; rank++) {
    cumulative += rankDistribution[rank]
    if (cumulative >= median) return rank + 1
  }

  return rankDistribution.length
}

/**
 * Compute zone probabilities from rank distribution.
 * @param {number[]} rankDistribution
 * @param {number} numSimulations
 * @returns {{ europe: number, top6: number, mid: number, relegation: number }}
 */
export function computeZoneProbabilities(rankDistribution, numSimulations) {
  let europe = 0, top6 = 0, mid = 0, relegation = 0

  for (let rank = 0; rank < rankDistribution.length; rank++) {
    const count = rankDistribution[rank]
    const r = rank + 1
    if (r <= 2) europe += count
    else if (r <= 6) top6 += count
    else if (r <= 12) mid += count
    else relegation += count
  }

  return {
    europe: europe / numSimulations,
    top6: top6 / numSimulations,
    mid: mid / numSimulations,
    relegation: relegation / numSimulations,
  }
}

// ─── Simulation-specific functions ───────────────────────────────────────

/**
 * Convert outcome string to fictive scores.
 * @param {string} outcome — 'homeWin' | 'draw' | 'awayWin'
 * @returns {{ homeScore: number, awayScore: number }}
 */
function outcomeToScores(outcome) {
  if (outcome === 'homeWin') return { homeScore: 25, awayScore: 15 }
  if (outcome === 'draw') return { homeScore: 20, awayScore: 20 }
  return { homeScore: 15, awayScore: 25 }
}

/**
 * Convert outcome to base rugby points.
 * @param {string} outcome
 * @returns {{ homePoints: number, awayPoints: number }}
 */
function outcomeToPoints(outcome) {
  if (outcome === 'homeWin') return { homePoints: 4, awayPoints: 0 }
  if (outcome === 'draw') return { homePoints: 2, awayPoints: 2 }
  return { homePoints: 0, awayPoints: 4 }
}

/**
 * Build a matchKey from a calendar entry.
 * Duplicated from tab-simulateur.js to avoid circular dependency
 * (simulator-engine is imported by tab-simulateur).
 * @param {{ matchday: number, home: string, away: string }} match
 * @returns {string}
 */
export function matchKey(match) {
  return `${match.matchday}-${match.home}-${match.away}`
}

/**
 * Apply user-simulated results: compute Elo changes + rugby points for each
 * simulated match, and return the remaining (non-simulated) calendar.
 *
 * @param {object} simulatedResults — { [matchKey]: { outcome, bonus } }
 * @param {object} season — season data with teams, calendar
 * @returns {{ elos: Map<string, number>, rugbyPoints: Map<string, number>, remainingCalendar: object[] }}
 */
export function applySimulatedResults(simulatedResults, season) {
  const elos = new Map()
  const rugbyPoints = new Map()

  for (const team of season.teams) {
    elos.set(team.id, team.elo)
    rugbyPoints.set(team.id, 0)
  }

  const remainingCalendar = []

  for (const match of season.calendar) {
    const key = matchKey(match)
    const sim = simulatedResults[key]

    if (!sim || sim.outcome == null) {
      // Not simulated — add to remaining calendar if upcoming
      if (match.homeScore == null) {
        remainingCalendar.push(match)
      }
      continue
    }

    const { homeScore, awayScore } = outcomeToScores(sim.outcome)
    const { homeChange, awayChange } = calculateEloChange({
      homeScore, awayScore,
      eloHome: elos.get(match.home),
      eloAway: elos.get(match.away),
    })

    elos.set(match.home, elos.get(match.home) + homeChange)
    elos.set(match.away, elos.get(match.away) + awayChange)

    const { homePoints, awayPoints } = outcomeToPoints(sim.outcome)
    let homePts = homePoints
    let awayPts = awayPoints

    if (sim.bonus === 'offensive') {
      // +1 to winner (or both if draw)
      if (sim.outcome === 'homeWin') homePts += 1
      else if (sim.outcome === 'awayWin') awayPts += 1
      else { homePts += 1; awayPts += 1 }
    } else if (sim.bonus === 'defensive') {
      // +1 to loser
      if (sim.outcome === 'homeWin') awayPts += 1
      else if (sim.outcome === 'awayWin') homePts += 1
    }

    rugbyPoints.set(match.home, rugbyPoints.get(match.home) + homePts)
    rugbyPoints.set(match.away, rugbyPoints.get(match.away) + awayPts)
  }

  return { elos, rugbyPoints, remainingCalendar }
}

/**
 * Full recalculation orchestrator: apply simulated results, run Monte Carlo
 * on remaining matches, compute new projections, and return teams with deltas.
 *
 * @param {object} season — current season data
 * @param {object} simulatedResults — { [matchKey]: { outcome, bonus } }
 * @param {function} [rng=Math.random]
 * @returns {object[]} — teams array with projectedRank, zones, elo, delta
 */
export function recalculateProjections(season, simulatedResults, rng = Math.random) {
  const { elos, rugbyPoints, remainingCalendar } = applySimulatedResults(simulatedResults, season)

  const { rankCounts } = simulateSeason(elos, remainingCalendar, NUM_SIMULATIONS, rng, rugbyPoints)

  return season.teams.map((originalTeam) => {
    const distribution = rankCounts.get(originalTeam.id) || new Array(season.teams.length).fill(0)
    const projectedRank = computeProjectedRank(distribution, NUM_SIMULATIONS)
    const zones = computeZoneProbabilities(distribution, NUM_SIMULATIONS)

    const delta = {
      rank: projectedRank - originalTeam.projectedRank,
      europe: zones.europe - originalTeam.zones.europe,
      top6: zones.top6 - originalTeam.zones.top6,
      mid: zones.mid - originalTeam.zones.mid,
      relegation: zones.relegation - originalTeam.zones.relegation,
    }

    return {
      ...originalTeam,
      elo: Math.round(elos.get(originalTeam.id)),
      projectedRank,
      zones,
      delta,
    }
  })
}
