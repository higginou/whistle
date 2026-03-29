import { describe, it, expect, beforeEach } from 'vitest'
import { computeTier, filterUpcomingForTeam, buildContent } from '../src/components/bottom-sheet.js'

/** Minimal team factory */
function makeTeam(overrides = {}) {
  return {
    id: 'la-rochelle',
    name: 'Stade Rochelais',
    currentRank: 4,
    projectedRank: 3,
    elo: 1582,
    confidence: 0.74,
    zones: { europe: 0.35, top6: 0.40, mid: 0.20, relegation: 0.05 },
    form: ['W', 'W', 'L', 'W', 'D'],
    trend: 'up',
    ...overrides,
  }
}

function makeSeason(teamOverrides = {}, calendar = []) {
  return {
    id: '2025-2026',
    teams: [
      makeTeam(teamOverrides),
      {
        id: 'toulouse',
        name: 'Stade Toulousain',
        currentRank: 1,
        projectedRank: 1,
        elo: 1650,
        confidence: 0.85,
        zones: { europe: 0.60, top6: 0.30, mid: 0.08, relegation: 0.02 },
        form: ['W', 'W', 'W', 'W', 'L'],
        trend: 'stable',
      },
    ],
    calendar,
  }
}

describe('bottom-sheet — computeTier', () => {
  it('returns Elite for high Elo', () => {
    const { label, pct } = computeTier(1650)
    expect(label).toBe('Elite')
    expect(pct).toBeGreaterThanOrEqual(80)
  })

  it('returns Veteran for mid-high Elo', () => {
    const { label } = computeTier(1560)
    expect(label).toBe('Veteran')
  })

  it('returns Titulaire for mid Elo', () => {
    const { label } = computeTier(1490)
    expect(label).toBe('Titulaire')
  })

  it('returns Espoir for low Elo', () => {
    const { label } = computeTier(1420)
    expect(label).toBe('Espoir')
  })

  it('returns Recrue for very low Elo', () => {
    const { label } = computeTier(1360)
    expect(label).toBe('Recrue')
  })

  it('clamps pct to 0-100', () => {
    expect(computeTier(1200).pct).toBe(0)
    expect(computeTier(1800).pct).toBe(100)
  })
})

describe('bottom-sheet — filterUpcomingForTeam', () => {
  it('returns unplayed matches for the given team', () => {
    const calendar = [
      { matchday: 21, home: 'la-rochelle', away: 'toulouse', homeScore: null, awayScore: null, difficulty: 0.8 },
      { matchday: 22, home: 'toulouse', away: 'la-rochelle', homeScore: null, awayScore: null, difficulty: 0.7 },
      { matchday: 23, home: 'clermont', away: 'toulouse', homeScore: null, awayScore: null, difficulty: 0.5 },
    ]
    const result = filterUpcomingForTeam(calendar, 'la-rochelle')
    expect(result).toHaveLength(2)
    expect(result[0].matchday).toBe(21)
    expect(result[1].matchday).toBe(22)
  })

  it('excludes played matches', () => {
    const calendar = [
      { matchday: 20, home: 'la-rochelle', away: 'pau', homeScore: 24, awayScore: 18, difficulty: 0.5 },
      { matchday: 21, home: 'la-rochelle', away: 'toulouse', homeScore: null, awayScore: null, difficulty: 0.8 },
    ]
    const result = filterUpcomingForTeam(calendar, 'la-rochelle')
    expect(result).toHaveLength(1)
    expect(result[0].matchday).toBe(21)
  })

  it('returns max 5 matches', () => {
    const calendar = Array.from({ length: 10 }, (_, i) => ({
      matchday: 21 + i,
      home: 'la-rochelle',
      away: `team-${i}`,
      homeScore: null,
      awayScore: null,
      difficulty: 0.5,
    }))
    expect(filterUpcomingForTeam(calendar, 'la-rochelle')).toHaveLength(5)
  })

  it('returns empty array for null/undefined calendar', () => {
    expect(filterUpcomingForTeam(null, 'la-rochelle')).toEqual([])
    expect(filterUpcomingForTeam(undefined, 'la-rochelle')).toEqual([])
  })

  it('filters for any team, not just la-rochelle', () => {
    const calendar = [
      { matchday: 21, home: 'toulouse', away: 'pau', homeScore: null, awayScore: null, difficulty: 0.6 },
      { matchday: 22, home: 'la-rochelle', away: 'toulouse', homeScore: null, awayScore: null, difficulty: 0.7 },
    ]
    const result = filterUpcomingForTeam(calendar, 'toulouse')
    expect(result).toHaveLength(2)
  })
})

describe('bottom-sheet — buildContent', () => {
  it('includes team name in output', () => {
    const team = makeTeam()
    const season = makeSeason()
    const html = buildContent(team, season)
    expect(html).toContain('Stade Rochelais')
  })

  it('includes Elo value', () => {
    const team = makeTeam()
    const season = makeSeason()
    const html = buildContent(team, season)
    expect(html).toContain('1582')
  })

  it('converts zone probabilities to percentages', () => {
    const team = makeTeam()
    const season = makeSeason()
    const html = buildContent(team, season)
    expect(html).toContain('35<span class="w-zone-card__pct-symbol">%</span>')
    expect(html).toContain('40<span class="w-zone-card__pct-symbol">%</span>')
    expect(html).toContain('20<span class="w-zone-card__pct-symbol">%</span>')
    expect(html).toContain('5<span class="w-zone-card__pct-symbol">%</span>')
  })

  it('displays form dots matching team.form', () => {
    const team = makeTeam({ form: ['W', 'L', 'D', 'W', 'W'] })
    const season = makeSeason({ form: ['W', 'L', 'D', 'W', 'W'] })
    const html = buildContent(team, season)
    // Count form dots
    const dotMatches = html.match(/w-sheet-form__dot w-sheet-form__dot--/g)
    expect(dotMatches).toHaveLength(5)
  })

  it('includes confidence percentage', () => {
    const team = makeTeam({ confidence: 0.74 })
    const season = makeSeason({ confidence: 0.74 })
    const html = buildContent(team, season)
    expect(html).toContain('74%')
    expect(html).toContain('Confiance')
  })

  it('includes progression ranks', () => {
    const team = makeTeam({ currentRank: 4, projectedRank: 3 })
    const season = makeSeason({ currentRank: 4, projectedRank: 3 })
    const html = buildContent(team, season)
    expect(html).toContain('Actuel')
    expect(html).toContain('Projete')
  })

  it('includes close button with aria-label Fermer', () => {
    const team = makeTeam()
    const season = makeSeason()
    const html = buildContent(team, season)
    expect(html).toContain('aria-label="Fermer"')
  })

  it('includes drag handle', () => {
    const team = makeTeam()
    const season = makeSeason()
    const html = buildContent(team, season)
    expect(html).toContain('w-bottom-sheet__handle')
  })

  it('shows all 4 zone cards', () => {
    const team = makeTeam()
    const season = makeSeason()
    const html = buildContent(team, season)
    expect(html).toContain('Demi-finales')
    expect(html).toContain('Top 6')
    expect(html).toContain('Milieu')
    expect(html).toContain('Relegation')
  })

  it('filters calendar for selected team only', () => {
    const calendar = [
      { matchday: 21, home: 'la-rochelle', away: 'toulouse', homeScore: null, awayScore: null, difficulty: 0.8 },
      { matchday: 22, home: 'clermont', away: 'pau', homeScore: null, awayScore: null, difficulty: 0.4 },
    ]
    const team = makeTeam()
    const season = makeSeason({}, calendar)
    const html = buildContent(team, season)
    expect(html).toContain('Stade Toulousain')
    // clermont vs pau should not appear for la-rochelle
    expect(html).not.toContain('clermont')
  })

  it('includes tier label', () => {
    const team = makeTeam({ elo: 1582 })
    const season = makeSeason({ elo: 1582 })
    const html = buildContent(team, season)
    // Elo 1582 → pct ~66 → Veteran
    expect(html).toContain('Veteran')
  })

  it('includes HUD corner accents', () => {
    const team = makeTeam()
    const season = makeSeason()
    const html = buildContent(team, season)
    expect(html).toContain('w-hud-corner--tl')
    expect(html).toContain('w-hud-corner--tr')
    expect(html).toContain('w-hud-corner--bl')
    expect(html).toContain('w-hud-corner--br')
  })
})
