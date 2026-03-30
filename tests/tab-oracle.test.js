// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { computePredictionRate, getBrierQuality, render } from '../src/components/tab-oracle.js'

describe('computePredictionRate', () => {
  it('returns correct/total/rate for nominal data', () => {
    const season = {
      matchday: 22,
      teams: [
        { id: 'toulouse', currentRank: 1 },
        { id: 'bordeaux-begles', currentRank: 2 },
        { id: 'la-rochelle', currentRank: 3 },
      ],
      predictions: [
        {
          matchday: 20,
          date: '2026-03-20T08:00:00Z',
          projections: [
            { teamId: 'toulouse', projectedRank: 1 },
            { teamId: 'bordeaux-begles', projectedRank: 3 },
            { teamId: 'la-rochelle', projectedRank: 2 },
          ],
        },
        {
          matchday: 21,
          date: '2026-03-27T08:00:00Z',
          projections: [
            { teamId: 'toulouse', projectedRank: 1 },
            { teamId: 'bordeaux-begles', projectedRank: 2 },
            { teamId: 'la-rochelle', projectedRank: 3 },
          ],
        },
      ],
    }
    const result = computePredictionRate(season)
    // Matchday 20: toulouse correct (1=1), bordeaux wrong (3≠2), la-rochelle wrong (2≠3) → 1/3
    // Matchday 21: toulouse correct (1=1), bordeaux correct (2=2), la-rochelle correct (3=3) → 3/3
    // Total: 4 correct / 6 total
    expect(result.correct).toBe(4)
    expect(result.total).toBe(6)
    expect(result.rate).toBeCloseTo(4 / 6, 4)
  })

  it('returns zero for empty predictions', () => {
    const season = { matchday: 5, teams: [], predictions: [] }
    const result = computePredictionRate(season)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(0)
    expect(result.rate).toBe(0)
  })

  it('returns zero when predictions is absent', () => {
    const season = { matchday: 5, teams: [] }
    const result = computePredictionRate(season)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(0)
    expect(result.rate).toBe(0)
  })

  it('returns zero when predictions is null', () => {
    const season = { matchday: 5, teams: [], predictions: null }
    const result = computePredictionRate(season)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(0)
    expect(result.rate).toBe(0)
  })
})

describe('getBrierQuality', () => {
  it('returns bon for score < 0.25', () => {
    expect(getBrierQuality(0.1)).toBe('bon')
    expect(getBrierQuality(0.24)).toBe('bon')
  })

  it('returns moyen for score 0.25-0.40', () => {
    expect(getBrierQuality(0.25)).toBe('moyen')
    expect(getBrierQuality(0.35)).toBe('moyen')
    expect(getBrierQuality(0.40)).toBe('moyen')
  })

  it('returns faible for score > 0.40', () => {
    expect(getBrierQuality(0.41)).toBe('faible')
    expect(getBrierQuality(0.8)).toBe('faible')
  })

  it('returns null for null input', () => {
    expect(getBrierQuality(null)).toBe(null)
  })
})

describe('tab-oracle render', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('renders Brier Score legendary card with value', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 0.23,
      teams: [{ id: 'toulouse', currentRank: 1, elo: 1514, confidence: 0.46, form: ['W', 'W'], trend: 'stable', zones: { europe: 0, top6: 1, mid: 0, relegation: 0 } }],
      predictions: [],
    }
    render(container, season)
    const legendary = container.querySelector('.w-oracle-legendary')
    expect(legendary).not.toBeNull()
    expect(legendary.textContent).toContain('0.23')
    expect(legendary.querySelector('.w-oracle-quality--bon')).not.toBeNull()
  })

  it('renders brierless state when brierScore is null', () => {
    const season = {
      matchday: 3,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
    }
    render(container, season)
    const brierless = container.querySelector('.w-oracle-brierless')
    expect(brierless).not.toBeNull()
    expect(brierless.textContent).toContain('Oracle se reveillera')
  })

  it('renders 6 factor cards', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 0.3,
      teams: [{ id: 'toulouse', currentRank: 1, elo: 1514, confidence: 0.46, form: ['W', 'W'], trend: 'stable', zones: { europe: 0, top6: 1, mid: 0, relegation: 0 } }],
      predictions: [],
    }
    render(container, season)
    const cards = container.querySelectorAll('.w-oracle-card')
    expect(cards.length).toBe(6)
  })

  it('renders prediction rate section', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 0.23,
      teams: [{ id: 'toulouse', currentRank: 1, elo: 1514, confidence: 0.46, form: ['W', 'W'], trend: 'stable', zones: { europe: 0, top6: 1, mid: 0, relegation: 0 } }],
      predictions: [],
    }
    render(container, season)
    const predict = container.querySelector('.w-oracle-predict-card')
    expect(predict).not.toBeNull()
  })

  it('renders moyen quality for brierScore 0.35', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 0.35,
      teams: [],
      predictions: [],
    }
    render(container, season)
    const legendary = container.querySelector('.w-oracle-legendary')
    expect(legendary).not.toBeNull()
    expect(legendary.querySelector('.w-oracle-quality--moyen')).not.toBeNull()
  })

  it('renders faible quality for brierScore 0.5', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 0.5,
      teams: [],
      predictions: [],
    }
    render(container, season)
    const legendary = container.querySelector('.w-oracle-legendary')
    expect(legendary).not.toBeNull()
    expect(legendary.querySelector('.w-oracle-quality--faible')).not.toBeNull()
  })

  it('renders brierless state for NaN brierScore', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 'invalid',
      teams: [],
      predictions: [],
    }
    render(container, season)
    const brierless = container.querySelector('.w-oracle-brierless')
    expect(brierless).not.toBeNull()
  })
})
