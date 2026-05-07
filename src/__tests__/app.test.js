// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => vi.fn()) }))
vi.mock('../data.js', () => ({ loadSeason: vi.fn() }))
vi.mock('../router.js', () => ({
  init: vi.fn(),
  isAdminPath: vi.fn(() => window.location.pathname.endsWith('/admin')),
  tabFromCurrentPath: vi.fn(() => 'classements'),
  pushTab: vi.fn(),
  pushSheet: vi.fn(),
}))
vi.mock('motion/mini', () => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
}))

describe('app integration', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    sessionStorage.clear()
    document.body.innerHTML = '<div id="app"></div>'
  })

  function makeSeason() {
    return {
      id: '2025-2026',
      matchday: 23,
      teams: [
        {
          id: 'la-rochelle',
          name: 'Stade Rochelais',
          currentRank: 9,
          projectedRank: 9,
          elo: 1517,
          points: 52,
          projectedPoints: 61,
          confidence: 0.52,
          zones: { europe: 0.0001, top6: 0.0678, mid: 0.9321, relegation: 0 },
          form: ['W', 'W', 'L', 'W', 'W'],
          trend: 'up',
        },
        { id: 'racing-92', name: 'Racing 92', currentRank: 8, projectedRank: 8, elo: 1530, confidence: 0.5, zones: {}, form: [], trend: 'stable' },
        { id: 'toulouse', name: 'Toulouse', currentRank: 1, projectedRank: 1, elo: 1700, confidence: 0.9, zones: {}, form: [], trend: 'stable' },
      ],
      predictions: [],
      calendar: [
        { home: 'racing-92', away: 'la-rochelle', homeScore: null, awayScore: null, difficulty: 0.37 },
      ],
    }
  }

  it('renders app shell on season load', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    set('season', { id: '2025-2026', matchday: 10, teams: [], predictions: [], calendar: [] })
    const shell = document.querySelector('.w-app-shell')
    expect(shell).not.toBeNull()
  })

  it('renders bottom nav on season load', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    set('season', { id: '2025-2026', matchday: 10, teams: [], predictions: [], calendar: [] })
    const nav = document.querySelector('.w-bottom-nav')
    expect(nav).not.toBeNull()
  })

  it('keeps body-mounted chrome idempotent across season refreshes', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    const season = { id: '2025-2026', matchday: 10, teams: [], predictions: [], calendar: [] }

    set('season', season)
    set('season', { ...season, lastUpdated: '2026-04-25T10:00:00Z' })

    expect(document.querySelectorAll('.w-bottom-nav')).toHaveLength(1)
    expect(document.querySelectorAll('dialog.w-bottom-sheet')).toHaveLength(1)
    expect(document.querySelectorAll('dialog.w-succes-sheet')).toHaveLength(1)
    expect(document.querySelectorAll('dialog.w-match-cockpit')).toHaveLength(1)
  })

  it('shows empty state when season is null', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    set('season', null)
    const fallback = document.querySelector('.w-empty-state')
    expect(fallback).not.toBeNull()
  })

  it('shows only Tribune arrival in classement content before session close', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')

    set('season', makeSeason())

    expect(document.querySelector('.w-tribune-arrival')).not.toBeNull()
    expect(document.querySelector('.w-score-card')).not.toBeNull()
    expect(document.querySelector('.w-standings-section')).toBeNull()
    expect(document.querySelector('.w-reveal-button')).toBeNull()
    expect(document.querySelector('.w-tribune-arrival__close')?.textContent).toBe('Fermer')
    expect(document.querySelector('.w-mini-card__confidence')?.textContent).toContain('Confiance 52%')
  })

  it('stores arrival closure for the session and displays classement immediately', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')

    set('season', makeSeason())
    document.querySelector('.w-tribune-arrival__close').click()

    expect(sessionStorage.getItem('w-tribune-arrival-closed')).toBe('1')
    expect(document.querySelector('.w-tribune-arrival')).toBeNull()
    expect(document.querySelector('.w-standings-section')).not.toBeNull()
    expect(document.body.textContent).not.toContain('Reveler la projection')
    expect(document.body.textContent).not.toContain('Projection en cours')
    expect(document.body.textContent).not.toContain('Rejouer')
  })

  it('closes Tribune arrival without triggering positional animation', async () => {
    const { animate } = await import('motion/mini')
    const { set } = await import('../store.js')
    await import('../app.js')

    set('season', makeSeason())
    vi.mocked(animate).mockClear()

    document.querySelector('.w-tribune-arrival__close').click()

    expect(animate).not.toHaveBeenCalled()
    expect(document.querySelector('.w-standings-section')).not.toBeNull()
  })

  it('skips Tribune arrival when session is already closed', async () => {
    sessionStorage.setItem('w-tribune-arrival-closed', '1')
    const { set } = await import('../store.js')
    await import('../app.js')

    set('season', makeSeason())

    expect(document.querySelector('.w-tribune-arrival')).toBeNull()
    expect(document.querySelector('.w-standings-section')).not.toBeNull()
  })

  it('renders admin access without waiting for season data', async () => {
    history.pushState({}, '', '/admin')
    const { loadSeason } = await import('../data.js')

    await import('../app.js')

    expect(document.querySelector('.w-admin-access')).not.toBeNull()
    expect(document.querySelector('.w-bottom-nav')).toBeNull()
    expect(loadSeason).not.toHaveBeenCalled()
    history.pushState({}, '', '/')
  })
})
