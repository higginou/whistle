// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => vi.fn()) }))
vi.mock('../data.js', () => ({ loadSeason: vi.fn(), loadScraped: vi.fn() }))
vi.mock('../router.js', () => ({
  init: vi.fn(),
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
    document.body.innerHTML = '<div id="app"></div>'
  })

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
})
