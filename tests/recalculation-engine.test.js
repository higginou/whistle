import { describe, expect, it } from 'vitest'
import { recomputeSeasonProjection } from '../src/recompute/recalculation-engine.js'

const teams = [
  { id: 'la-rochelle', name: 'Stade Rochelais' },
  { id: 'toulouse', name: 'Stade Toulousain' },
  { id: 'bordeaux-begles', name: 'Union Bordeaux Begles' },
  { id: 'toulon', name: 'RC Toulon' },
]

const matches = [
  {
    matchday: 1,
    date: '2025-09-06T19:00:00Z',
    homeTeamId: 'la-rochelle',
    awayTeamId: 'toulouse',
    homeScore: 24,
    awayScore: 18,
    homeBonus: { offensive: false, defensive: false },
    awayBonus: { offensive: false, defensive: true },
  },
  {
    matchday: 1,
    date: '2025-09-06T21:00:00Z',
    homeTeamId: 'bordeaux-begles',
    awayTeamId: 'toulon',
    homeScore: 20,
    awayScore: 20,
  },
]

const calendar = [
  {
    matchday: 2,
    date: '2025-09-13T19:00:00Z',
    homeTeamId: 'toulouse',
    awayTeamId: 'bordeaux-begles',
  },
  {
    matchday: 2,
    date: '2025-09-13T21:00:00Z',
    homeTeamId: 'toulon',
    awayTeamId: 'la-rochelle',
  },
]

describe('recomputeSeasonProjection', () => {
  it('rebuilds standings, Elo, and projections from explicit match inputs', () => {
    const result = recomputeSeasonProjection({
      seasonId: '2025-2026',
      matchday: 1,
      teams,
      matches,
      calendar,
      generatedAt: '2026-04-25T10:00:00Z',
      numSimulations: 50,
      seed: 123,
    })

    expect(result).toMatchObject({
      season: '2025-2026',
      matchday: 1,
      lastUpdated: '2026-04-25T10:00:00Z',
      modelVersion: 'recompute-v1',
      brierScore: null,
    })
    expect(result.teams).toHaveLength(4)
    expect(result.calendar).toHaveLength(2)
    expect(result.predictions).toHaveLength(1)

    const laRochelle = result.teams.find((team) => team.id === 'la-rochelle')
    expect(laRochelle.currentRank).toBe(1)
    expect(laRochelle.points).toBe(4)
    expect(laRochelle.elo).toBeGreaterThan(1500)
    expect(laRochelle).toHaveProperty('projectedRank')
    expect(laRochelle).toHaveProperty('zones')
    expect(laRochelle).toHaveProperty('confidence')
  })

  it('is deterministic for identical input and seed', () => {
    const input = {
      seasonId: '2025-2026',
      matchday: 1,
      teams,
      matches,
      calendar,
      generatedAt: '2026-04-25T10:00:00Z',
      numSimulations: 100,
      seed: 456,
    }

    expect(recomputeSeasonProjection(input)).toEqual(recomputeSeasonProjection(input))
  })

  it('does not mutate caller-owned input objects', () => {
    const input = {
      seasonId: '2025-2026',
      matchday: 1,
      teams,
      matches,
      calendar,
      generatedAt: '2026-04-25T10:00:00Z',
      numSimulations: 10,
      seed: 789,
    }
    const before = structuredClone(input)

    recomputeSeasonProjection(input)

    expect(input).toEqual(before)
  })

  it('runs with no browser or database dependency', () => {
    expect(() =>
      recomputeSeasonProjection({
        seasonId: '2025-2026',
        matchday: 1,
        teams,
        matches,
        calendar: [],
        generatedAt: '2026-04-25T10:00:00Z',
        numSimulations: 5,
      }),
    ).not.toThrow()
  })

  it('accepts raw database row names and ignores scheduled rows', () => {
    const result = recomputeSeasonProjection({
      seasonId: '2025-2026',
      matchday: 1,
      teams,
      matches: [
        {
          matchday: 1,
          date: '2025-09-06T19:00:00Z',
          home_team_id: 'la-rochelle',
          away_team_id: 'toulouse',
          home_score: 24,
          away_score: 18,
          status: 'played',
        },
        {
          matchday: 2,
          date: '2025-09-13T19:00:00Z',
          home_team_id: 'toulon',
          away_team_id: 'bordeaux-begles',
          home_score: null,
          away_score: null,
          status: 'scheduled',
        },
      ],
      calendar: [
        {
          matchday: 2,
          date: '2025-09-13T19:00:00Z',
          home_team_id: 'toulon',
          away_team_id: 'bordeaux-begles',
        },
      ],
      generatedAt: '2026-04-25T10:00:00Z',
      numSimulations: 20,
      seed: 321,
    })

    expect(result.teams.find((team) => team.id === 'la-rochelle').points).toBe(4)
    expect(result.teams.find((team) => team.id === 'toulon').points).toBe(0)
    expect(result.teams.find((team) => team.id === 'toulon').form).toEqual([])
  })

  it('fails loudly when a played row is missing scores or team ids', () => {
    expect(() =>
      recomputeSeasonProjection({
        seasonId: '2025-2026',
        matchday: 1,
        teams,
        matches: [
          {
            matchday: 1,
            date: '2025-09-06T19:00:00Z',
            homeTeamId: 'la-rochelle',
            awayTeamId: 'toulouse',
            status: 'played',
          },
        ],
        calendar: [],
        generatedAt: '2026-04-25T10:00:00Z',
        numSimulations: 5,
      }),
    ).toThrow(/scores/)

    expect(() =>
      recomputeSeasonProjection({
        seasonId: '2025-2026',
        matchday: 1,
        teams,
        matches: [],
        calendar: [{ matchday: 2, awayTeamId: 'toulouse' }],
        generatedAt: '2026-04-25T10:00:00Z',
        numSimulations: 5,
      }),
    ).toThrow(/calendar team ids/)
  })
})
