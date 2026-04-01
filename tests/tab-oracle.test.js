// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { set, reset } from '../src/store.js'
import { computePredictionRate, getBrierQuality, render, renderJournalSection } from '../src/components/tab-oracle.js'

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
    reset()
    set('viewMode', 'detaille')
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

  it('renders journal section with toggle', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
      corrections: [],
    }
    render(container, season)
    const toggle = container.querySelector('.w-oracle-journal-toggle')
    expect(toggle).not.toBeNull()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders journal pages when corrections exist', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
      corrections: [
        { matchday: 8, date: '2025-11-10T00:00:00Z', title: 'Test fix', description: 'Desc', impact: 'positive', parameter: 'test', oldValue: 1.0, newValue: 1.5, type: 'correction' },
        { matchday: 13, date: '2026-01-12T00:00:00Z', title: 'Recal', description: 'Desc2', impact: 'neutral', parameter: 'decay', oldValue: 0.9, newValue: 0.8, type: 'recalibration' },
      ],
    }
    render(container, season)
    const pages = container.querySelectorAll('.w-oracle-journal-page')
    expect(pages.length).toBe(2)
  })

  it('renders empty state when corrections is empty', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
      corrections: [],
    }
    render(container, season)
    const empty = container.querySelector('.w-oracle-journal-empty')
    expect(empty).not.toBeNull()
    expect(empty.textContent).toContain('pas encore eu besoin de se corriger')
  })

  it('renders empty state when corrections is absent', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
    }
    render(container, season)
    const empty = container.querySelector('.w-oracle-journal-empty')
    expect(empty).not.toBeNull()
  })

  it('renders empty state when corrections is null', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
      corrections: null,
    }
    render(container, season)
    const empty = container.querySelector('.w-oracle-journal-empty')
    expect(empty).not.toBeNull()
  })

  it('toggle expands and collapses journal content', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
      corrections: [
        { matchday: 8, date: '2025-11-10T00:00:00Z', title: 'Fix', description: 'D', impact: 'positive', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
      ],
    }
    render(container, season)
    const toggle = container.querySelector('.w-oracle-journal-toggle')
    const content = container.querySelector('#w-oracle-journal-content')

    expect(content.hidden).toBe(true)
    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(content.hidden).toBe(false)

    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(content.hidden).toBe(true)
  })
})

describe('renderJournalSection', () => {
  it('renders correction type badge', () => {
    const html = renderJournalSection([
      { matchday: 5, date: '2025-10-01T00:00:00Z', title: 'T', description: 'D', impact: 'positive', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
    ])
    expect(html).toContain('w-oracle-journal-type-badge--correction')
    expect(html).toContain('Correction')
  })

  it('renders recalibration type badge', () => {
    const html = renderJournalSection([
      { matchday: 13, date: '2026-01-12T00:00:00Z', title: 'R', description: 'D', impact: 'neutral', parameter: 'p', oldValue: 0.9, newValue: 0.8, type: 'recalibration' },
    ])
    expect(html).toContain('w-oracle-journal-type-badge--recalibration')
    expect(html).toContain('Recalibrage')
  })

  it('renders impact badges correctly', () => {
    const entries = [
      { matchday: 1, date: '2025-09-01T00:00:00Z', title: 'T', description: 'D', impact: 'positive', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
      { matchday: 2, date: '2025-09-15T00:00:00Z', title: 'T', description: 'D', impact: 'neutral', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
      { matchday: 3, date: '2025-10-01T00:00:00Z', title: 'T', description: 'D', impact: 'negative', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
    ]
    const html = renderJournalSection(entries)
    expect(html).toContain('w-oracle-journal-impact--positive')
    expect(html).toContain('w-oracle-journal-impact--neutral')
    expect(html).toContain('w-oracle-journal-impact--negative')
  })

  it('sorts entries by matchday ascending', () => {
    const entries = [
      { matchday: 16, date: '2026-02-08T00:00:00Z', title: 'Late', description: 'D', impact: 'negative', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
      { matchday: 8, date: '2025-11-10T00:00:00Z', title: 'Early', description: 'D', impact: 'positive', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
    ]
    const html = renderJournalSection(entries)
    const earlyIdx = html.indexOf('Early')
    const lateIdx = html.indexOf('Late')
    expect(earlyIdx).toBeLessThan(lateIdx)
  })

  it('renders old/new values with NaN guard', () => {
    const html = renderJournalSection([
      { matchday: 5, date: '2025-10-01T00:00:00Z', title: 'T', description: 'D', impact: 'positive', parameter: 'p', oldValue: Number.NaN, newValue: 1.5, type: 'correction' },
    ])
    expect(html).toContain('?')
    expect(html).toContain('1.5')
  })

  it('escapes HTML in title and description', () => {
    const html = renderJournalSection([
      { matchday: 5, date: '2025-10-01T00:00:00Z', title: '<script>alert(1)</script>', description: 'a&b', impact: 'positive', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
    ])
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('a&amp;b')
  })

  it('renders seal when entries exist', () => {
    const html = renderJournalSection([
      { matchday: 5, date: '2025-10-01T00:00:00Z', title: 'T', description: 'D', impact: 'positive', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
    ])
    expect(html).toContain('w-oracle-journal-seal')
    expect(html).toContain('Scelle par')
  })

  it('does not render seal for empty state', () => {
    const html = renderJournalSection([])
    expect(html).not.toContain('w-oracle-journal-seal')
  })
})

describe('tab-oracle render — viewMode simple', () => {
  let container

  beforeEach(() => {
    reset()
    set('viewMode', 'simple')
    container = document.createElement('div')
  })

  it('hides Brier card in simple mode', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 0.23,
      teams: [{ id: 'toulouse', currentRank: 1, elo: 1514, confidence: 0.46, form: ['W', 'W'], trend: 'stable', zones: { europe: 0, top6: 1, mid: 0, relegation: 0 } }],
      predictions: [],
    }
    render(container, season)
    expect(container.querySelector('.w-oracle-legendary')).toBeNull()
    expect(container.querySelector('.w-oracle-brierless')).toBeNull()
  })

  it('hides factor cards in simple mode', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 0.3,
      teams: [],
      predictions: [],
    }
    render(container, season)
    expect(container.querySelectorAll('.w-oracle-card').length).toBe(0)
  })

  it('hides journal section in simple mode', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
      corrections: [
        { matchday: 8, date: '2025-11-10T00:00:00Z', title: 'Fix', description: 'D', impact: 'positive', parameter: 'p', oldValue: 1, newValue: 2, type: 'correction' },
      ],
    }
    render(container, season)
    expect(container.querySelector('.w-oracle-journal')).toBeNull()
  })

  it('still shows prediction card in simple mode', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: 0.23,
      teams: [],
      predictions: [],
    }
    render(container, season)
    expect(container.querySelector('.w-oracle-predict-card')).not.toBeNull()
  })

  it('still shows header (level pill + title + journee) in simple mode', () => {
    const season = {
      matchday: 20,
      lastUpdated: '2026-03-29T08:50:25Z',
      brierScore: null,
      teams: [],
      predictions: [],
    }
    render(container, season)
    expect(container.querySelector('.w-oracle-level-pill')).not.toBeNull()
    expect(container.querySelector('.w-oracle-title')).not.toBeNull()
    expect(container.querySelector('.w-oracle-subtitle')).not.toBeNull()
  })
})
