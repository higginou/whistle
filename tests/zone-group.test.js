import { describe, it, expect, beforeEach } from 'vitest'
import { assignTeamsToZones } from '../src/components/zone-group.js'

/** Minimal team factory */
function makeTeam(rank, overrides = {}) {
  return {
    id: `team-${rank}`,
    name: `Team ${rank}`,
    currentRank: rank,
    projectedRank: rank,
    elo: 1500,
    points: 50,
    confidence: 0.5,
    trend: 'stable',
    ...overrides,
  }
}

function makeAllTeams() {
  return Array.from({ length: 14 }, (_, i) => makeTeam(i + 1))
}

describe('zone-group — assignTeamsToZones', () => {
  it('splits 14 teams into 4 zones with correct counts', () => {
    const teams = makeAllTeams()
    const zones = assignTeamsToZones(teams)

    expect(zones).toHaveLength(4)
    expect(zones[0].key).toBe('qualif')
    expect(zones[0].label).toBe('Demi-finales')
    expect(zones[0].teams).toHaveLength(2)

    expect(zones[1].key).toBe('top6')
    expect(zones[1].label).toBe('Phases finales')
    expect(zones[1].teams).toHaveLength(4)

    expect(zones[2].key).toBe('mid')
    expect(zones[2].label).toBe('Ventre mou')
    expect(zones[2].teams).toHaveLength(6)

    expect(zones[3].key).toBe('relegation')
    expect(zones[3].label).toBe('Maintien')
    expect(zones[3].teams).toHaveLength(2)
  })

  it('assigns rank 1-2 to qualif zone', () => {
    const teams = makeAllTeams()
    const zones = assignTeamsToZones(teams)
    const qualifRanks = zones[0].teams.map((t) => t.currentRank)
    expect(qualifRanks).toEqual([1, 2])
  })

  it('assigns rank 13-14 to relegation zone', () => {
    const teams = makeAllTeams()
    const zones = assignTeamsToZones(teams)
    const relegRanks = zones[3].teams.map((t) => t.currentRank)
    expect(relegRanks).toEqual([13, 14])
  })

  it('handles unsorted input (filters by rank, not position)', () => {
    const teams = makeAllTeams().reverse()
    const zones = assignTeamsToZones(teams)
    expect(zones[0].teams).toHaveLength(2)
    expect(zones[0].teams.every((t) => t.currentRank <= 2)).toBe(true)
  })
})
