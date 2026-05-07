// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reset, set, get } from '../store.js'
import { render, resetBadgeState } from '../components/badge.js'

const MOCK_SEASON = {
  season: '2025-2026',
  lastUpdated: '2026-03-29T08:50:25Z',
  matchday: 20,
  teams: [
    {
      id: 'la-rochelle',
      name: 'Stade Rochelais',
      currentRank: 9,
      projectedRank: 10,
      elo: 1487,
      confidence: 0.46,
      zones: { europe: 0, top6: 0, mid: 1, relegation: 0 },
      form: ['L'],
      trend: 'stable',
    },
  ],
  calendar: [],
  predictions: [],
}

describe('badge', () => {
  let container

  beforeEach(() => {
    reset()
    resetBadgeState()
    container = document.createElement('span')
    container.className = 'w-score-card__badge-slot'
    document.body.appendChild(container)
  })

  it('renders nothing when dataFresh is false', () => {
    set('season', MOCK_SEASON)
    render(container)
    expect(container.querySelector('.w-badge-new')).toBeNull()
  })

  it('renders badge pill when dataFresh is true', () => {
    set('dataFresh', true)
    set('season', MOCK_SEASON)
    render(container)
    const badge = container.querySelector('.w-badge-new')
    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe('J20 Nouveau')
  })

  it('badge has role="status" and aria-live="polite"', () => {
    set('dataFresh', true)
    set('season', MOCK_SEASON)
    render(container)
    const badge = container.querySelector('.w-badge-new')
    expect(badge.getAttribute('role')).toBe('status')
    expect(badge.getAttribute('aria-live')).toBe('polite')
  })

  it('badge disappears when Tribune arrival closes', () => {
    set('dataFresh', true)
    set('season', MOCK_SEASON)
    render(container)

    const badge = container.querySelector('.w-badge-new')
    expect(badge).not.toBeNull()

    // Simulate reduced motion for instant removal in test env
    globalThis.matchMedia = vi.fn().mockReturnValue({ matches: true })

    set('tribuneArrivalClosed', true)
    expect(container.querySelector('.w-badge-new')).toBeNull()
  })

  it('badge is not re-shown after Tribune arrival close resets to false', () => {
    set('dataFresh', true)
    set('season', MOCK_SEASON)
    render(container)

    expect(container.querySelector('.w-badge-new')).not.toBeNull()

    globalThis.matchMedia = vi.fn().mockReturnValue({ matches: true })
    set('tribuneArrivalClosed', true)
    expect(container.querySelector('.w-badge-new')).toBeNull()

    // Reset arrival close — badge should NOT reappear
    set('tribuneArrivalClosed', false)
    // Trigger data fresh again to test one-shot behavior
    set('dataFresh', true)
    expect(container.querySelector('.w-badge-new')).toBeNull()
  })

  it('displays correct matchday number from season data', () => {
    const customSeason = { ...MOCK_SEASON, matchday: 15 }
    set('dataFresh', true)
    set('season', customSeason)
    render(container)
    const badge = container.querySelector('.w-badge-new')
    expect(badge.textContent).toBe('J15 Nouveau')
  })

  it('renders badge when dataFresh arrives after render', () => {
    set('season', MOCK_SEASON)
    render(container)
    expect(container.querySelector('.w-badge-new')).toBeNull()

    set('dataFresh', true)
    const badge = container.querySelector('.w-badge-new')
    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe('J20 Nouveau')
  })

  it('renders badge when season arrives after dataFresh', () => {
    set('dataFresh', true)
    render(container)
    expect(container.querySelector('.w-badge-new')).toBeNull()

    set('season', MOCK_SEASON)
    const badge = container.querySelector('.w-badge-new')
    expect(badge).not.toBeNull()
  })

  it('badge survives when container is re-appended to a new parent', () => {
    set('dataFresh', true)
    set('season', MOCK_SEASON)
    render(container)
    expect(container.querySelector('.w-badge-new')).not.toBeNull()

    // Simulate score-card innerHTML rebuild: container is detached then re-appended
    const newParent = document.createElement('div')
    newParent.appendChild(container)

    // Re-set season to trigger listeners (simulates network refresh)
    set('season', { ...MOCK_SEASON, matchday: 21 })

    // Badge should still be present in the same container
    const badge = container.querySelector('.w-badge-new')
    expect(badge).not.toBeNull()
  })
})
