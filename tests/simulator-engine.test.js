// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  calculateExpectedScore,
  calculateEloChange,
  simulateMatch,
  simulateSeason,
  computeProjectedRank,
  computeZoneProbabilities,
  applySimulatedResults,
  recalculateProjections,
  NUM_SIMULATIONS,
  K_FACTOR,
  HOME_ADVANTAGE,
  MARGIN_FACTOR,
} from '../src/simulator-engine.js'

// ── calculateExpectedScore ──

describe('calculateExpectedScore', () => {
  it('returns 0.5 for equal Elos', () => {
    expect(calculateExpectedScore(1500, 1500)).toBeCloseTo(0.5, 5)
  })

  it('returns higher probability for stronger team', () => {
    const result = calculateExpectedScore(1700, 1500)
    expect(result).toBeGreaterThan(0.5)
    expect(result).toBeLessThan(1)
  })

  it('returns lower probability for weaker team', () => {
    const result = calculateExpectedScore(1300, 1500)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(0.5)
  })

  it('matches the Elo formula exactly', () => {
    const expected = 1 / (1 + 10 ** ((1500 - 1600) / 400))
    expect(calculateExpectedScore(1600, 1500)).toBeCloseTo(expected, 10)
  })
})

// ── calculateEloChange ──

describe('calculateEloChange', () => {
  it('returns positive homeChange for home win', () => {
    const { homeChange, awayChange } = calculateEloChange({
      homeScore: 25, awayScore: 15, eloHome: 1500, eloAway: 1500,
    })
    expect(homeChange).toBeGreaterThan(0)
    expect(awayChange).toBeLessThan(0)
    expect(homeChange).toBeCloseTo(-awayChange, 10)
  })

  it('returns negative homeChange for away win', () => {
    const { homeChange } = calculateEloChange({
      homeScore: 15, awayScore: 25, eloHome: 1500, eloAway: 1500,
    })
    expect(homeChange).toBeLessThan(0)
  })

  it('applies margin factor', () => {
    const narrow = calculateEloChange({
      homeScore: 21, awayScore: 20, eloHome: 1500, eloAway: 1500,
    })
    const wide = calculateEloChange({
      homeScore: 40, awayScore: 10, eloHome: 1500, eloAway: 1500,
    })
    expect(Math.abs(wide.homeChange)).toBeGreaterThan(Math.abs(narrow.homeChange))
  })

  it('incorporates home advantage in expected score', () => {
    // Home team expected to win more often → smaller reward for winning
    const homeWin = calculateEloChange({
      homeScore: 25, awayScore: 15, eloHome: 1500, eloAway: 1500,
    })
    // homeChange should be smaller than K_FACTOR because expectedHome > 0.5
    expect(homeWin.homeChange).toBeLessThan(K_FACTOR)
  })

  it('handles draw result', () => {
    const { homeChange, awayChange } = calculateEloChange({
      homeScore: 20, awayScore: 20, eloHome: 1500, eloAway: 1500,
    })
    // Draw for home team with home advantage → expected > 0.5 → slight negative change
    expect(homeChange).toBeLessThan(0)
    expect(awayChange).toBeGreaterThan(0)
  })
})

// ── simulateMatch ──

describe('simulateMatch', () => {
  it('returns home win for low roll', () => {
    const rng = () => 0.01 // very low → should be home win
    const result = simulateMatch(1500, 1500, rng)
    expect(result.homePoints).toBe(4)
    expect(result.awayPoints).toBe(0)
  })

  it('returns away win for high roll', () => {
    const rng = () => 0.99
    const result = simulateMatch(1500, 1500, rng)
    expect(result.homePoints).toBe(0)
    expect(result.awayPoints).toBe(4)
  })

  it('returns draw for roll in draw range', () => {
    // For equal Elos: expectedHome ~0.6 (with home advantage)
    // drawProb ~0.15 * (1 - |0.6 - 0.5| * 2) = 0.15 * 0.8 = 0.12
    // homeWinProb ~0.6 * 0.88 = 0.528
    // Draw range: 0.528 to 0.648
    const rng = () => 0.59
    const result = simulateMatch(1500, 1500, rng)
    expect(result.homePoints).toBe(2)
    expect(result.awayPoints).toBe(2)
  })

  it('returns Elo changes', () => {
    const rng = () => 0.01
    const result = simulateMatch(1500, 1500, rng)
    expect(result.homeEloChange).toBeDefined()
    expect(result.awayEloChange).toBeDefined()
    expect(result.homeEloChange).toBeCloseTo(-result.awayEloChange, 10)
  })
})

// ── simulateSeason ──

describe('simulateSeason', () => {
  it('produces rank distributions that sum to numSimulations', () => {
    const elos = new Map([['a', 1600], ['b', 1500], ['c', 1400]])
    const calendar = [
      { home: 'a', away: 'b' },
      { home: 'b', away: 'c' },
    ]
    const numSim = 100
    let seed = 42
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const { rankCounts } = simulateSeason(elos, calendar, numSim, rng)

    for (const [, counts] of rankCounts) {
      const total = counts.reduce((s, c) => s + c, 0)
      expect(total).toBe(numSim)
    }
  })

  it('higher Elo team gets more first-place finishes', () => {
    const elos = new Map([['strong', 1700], ['weak', 1300]])
    const calendar = [{ home: 'strong', away: 'weak' }]
    let seed = 123
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const { rankCounts } = simulateSeason(elos, calendar, 500, rng)

    const strongFirst = rankCounts.get('strong')[0]
    const weakFirst = rankCounts.get('weak')[0]
    expect(strongFirst).toBeGreaterThan(weakFirst)
  })

  it('respects initialPoints from simulated matches', () => {
    const elos = new Map([['a', 1500], ['b', 1500]])
    const calendar = [] // no remaining matches
    const initialPoints = new Map([['a', 20], ['b', 0]])
    let seed = 42
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const { rankCounts } = simulateSeason(elos, calendar, 100, rng, initialPoints)

    // Team 'a' has 20 points, 'b' has 0 → 'a' always ranks first
    expect(rankCounts.get('a')[0]).toBe(100)
    expect(rankCounts.get('b')[0]).toBe(0)
  })
})

// ── computeProjectedRank ──

describe('computeProjectedRank', () => {
  it('returns rank 1 if team finishes first in majority of sims', () => {
    const dist = [80, 20] // 80% rank 1, 20% rank 2
    expect(computeProjectedRank(dist, 100)).toBe(1)
  })

  it('returns rank 2 if median is at rank 2', () => {
    const dist = [30, 70] // 30% rank 1, 70% rank 2
    expect(computeProjectedRank(dist, 100)).toBe(2)
  })

  it('handles even split', () => {
    const dist = [50, 50]
    expect(computeProjectedRank(dist, 100)).toBe(1) // cumulative >= 50 at rank 0
  })
})

// ── computeZoneProbabilities ──

describe('computeZoneProbabilities', () => {
  it('assigns correct zones by rank position', () => {
    // 14 ranks: rank 1-2 europe, 3-6 top6, 7-12 mid, 13-14 relegation
    const dist = new Array(14).fill(0)
    dist[0] = 50  // rank 1
    dist[5] = 30  // rank 6
    dist[10] = 15 // rank 11
    dist[13] = 5  // rank 14
    const result = computeZoneProbabilities(dist, 100)
    expect(result.europe).toBeCloseTo(0.5, 5)
    expect(result.top6).toBeCloseTo(0.3, 5)
    expect(result.mid).toBeCloseTo(0.15, 5)
    expect(result.relegation).toBeCloseTo(0.05, 5)
  })

  it('all probabilities sum to 1', () => {
    const dist = [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 3, 1, 1, 0]
    const total = dist.reduce((s, v) => s + v, 0)
    const result = computeZoneProbabilities(dist, total)
    const sum = result.europe + result.top6 + result.mid + result.relegation
    expect(sum).toBeCloseTo(1, 5)
  })
})

// ── applySimulatedResults ──

describe('applySimulatedResults', () => {
  function makeSeason() {
    return {
      matchday: 20,
      teams: [
        { id: 'toulouse', elo: 1600, currentRank: 1, name: 'Toulouse' },
        { id: 'la-rochelle', elo: 1550, currentRank: 2, name: 'La Rochelle' },
        { id: 'bordeaux-begles', elo: 1500, currentRank: 3, name: 'Bordeaux' },
      ],
      calendar: [
        { matchday: 21, home: 'toulouse', away: 'la-rochelle' },
        { matchday: 21, home: 'bordeaux-begles', away: 'toulouse' },
      ],
    }
  }

  it('returns updated Elos and rugby points for simulated matches', () => {
    const season = makeSeason()
    const simulatedResults = {
      '21-toulouse-la-rochelle': { outcome: 'homeWin', bonus: null },
    }
    const result = applySimulatedResults(simulatedResults, season)
    expect(result.elos.get('toulouse')).toBeGreaterThan(1600)
    expect(result.elos.get('la-rochelle')).toBeLessThan(1550)
    expect(result.rugbyPoints.get('toulouse')).toBe(4)
    expect(result.rugbyPoints.get('la-rochelle')).toBe(0)
  })

  it('handles draw outcome', () => {
    const season = makeSeason()
    const simulatedResults = {
      '21-toulouse-la-rochelle': { outcome: 'draw', bonus: null },
    }
    const result = applySimulatedResults(simulatedResults, season)
    expect(result.rugbyPoints.get('toulouse')).toBe(2)
    expect(result.rugbyPoints.get('la-rochelle')).toBe(2)
  })

  it('handles awayWin outcome', () => {
    const season = makeSeason()
    const simulatedResults = {
      '21-toulouse-la-rochelle': { outcome: 'awayWin', bonus: null },
    }
    const result = applySimulatedResults(simulatedResults, season)
    expect(result.rugbyPoints.get('toulouse')).toBe(0)
    expect(result.rugbyPoints.get('la-rochelle')).toBe(4)
  })

  it('applies offensive bonus (+1 point to winner)', () => {
    const season = makeSeason()
    const simulatedResults = {
      '21-toulouse-la-rochelle': { outcome: 'homeWin', bonus: 'offensive' },
    }
    const result = applySimulatedResults(simulatedResults, season)
    // offensive bonus: +1 to winning team
    expect(result.rugbyPoints.get('toulouse')).toBe(5)
  })

  it('applies defensive bonus (+1 point to loser)', () => {
    const season = makeSeason()
    const simulatedResults = {
      '21-toulouse-la-rochelle': { outcome: 'homeWin', bonus: 'defensive' },
    }
    const result = applySimulatedResults(simulatedResults, season)
    expect(result.rugbyPoints.get('la-rochelle')).toBe(1)
  })

  it('returns remaining calendar (non-simulated matches)', () => {
    const season = makeSeason()
    const simulatedResults = {
      '21-toulouse-la-rochelle': { outcome: 'homeWin', bonus: null },
    }
    const result = applySimulatedResults(simulatedResults, season)
    expect(result.remainingCalendar).toHaveLength(1)
    expect(result.remainingCalendar[0].home).toBe('bordeaux-begles')
  })
})

// ── recalculateProjections ──

describe('recalculateProjections', () => {
  function makeSeason() {
    return {
      matchday: 20,
      teams: [
        { id: 'team-a', elo: 1600, currentRank: 1, projectedRank: 1, name: 'Team A', zones: { europe: 0.8, top6: 0.15, mid: 0.04, relegation: 0.01 } },
        { id: 'team-b', elo: 1550, currentRank: 2, projectedRank: 2, name: 'Team B', zones: { europe: 0.6, top6: 0.3, mid: 0.08, relegation: 0.02 } },
        { id: 'team-c', elo: 1500, currentRank: 3, projectedRank: 3, name: 'Team C', zones: { europe: 0.3, top6: 0.4, mid: 0.25, relegation: 0.05 } },
        { id: 'team-d', elo: 1450, currentRank: 4, projectedRank: 4, name: 'Team D', zones: { europe: 0.1, top6: 0.3, mid: 0.5, relegation: 0.1 } },
      ],
      calendar: [
        { matchday: 21, home: 'team-a', away: 'team-d' },
        { matchday: 21, home: 'team-c', away: 'team-b' },
      ],
    }
  }

  it('returns an array of teams with recalculated projections and deltas', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const season = makeSeason()
    const simulatedResults = {
      '21-team-a-team-d': { outcome: 'homeWin', bonus: null },
    }

    const result = recalculateProjections(season, simulatedResults, rng)

    expect(result).toHaveLength(4)
    for (const team of result) {
      expect(team).toHaveProperty('id')
      expect(team).toHaveProperty('projectedRank')
      expect(team).toHaveProperty('zones')
      expect(team).toHaveProperty('elo')
      expect(team).toHaveProperty('delta')
      expect(team.delta).toHaveProperty('rank')
      expect(team.delta).toHaveProperty('europe')
      expect(team.delta).toHaveProperty('top6')
      expect(team.delta).toHaveProperty('mid')
      expect(team.delta).toHaveProperty('relegation')
    }
  })

  it('preserves original team fields (id, name, currentRank)', () => {
    let seed = 99
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const season = makeSeason()
    const simulatedResults = {
      '21-team-a-team-d': { outcome: 'awayWin', bonus: null },
    }
    const result = recalculateProjections(season, simulatedResults, rng)

    const teamA = result.find((t) => t.id === 'team-a')
    expect(teamA.name).toBe('Team A')
    expect(teamA.currentRank).toBe(1)
  })

  it('computes deltas relative to original projections', () => {
    let seed = 42
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const season = makeSeason()
    const simulatedResults = {
      '21-team-a-team-d': { outcome: 'homeWin', bonus: null },
    }
    const result = recalculateProjections(season, simulatedResults, rng)

    for (const team of result) {
      const original = season.teams.find((t) => t.id === team.id)
      expect(team.delta.rank).toBe(team.projectedRank - original.projectedRank)
      expect(team.delta.europe).toBeCloseTo(team.zones.europe - original.zones.europe, 5)
      expect(team.delta.top6).toBeCloseTo(team.zones.top6 - original.zones.top6, 5)
    }
  })
})
