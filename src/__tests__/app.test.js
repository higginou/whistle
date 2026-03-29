// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest'

// Mock virtual:pwa-register (Vite virtual module, not available in test env)
vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => vi.fn()) }))

// Mock data.js to prevent actual fetch calls
vi.mock('../data.js', () => ({ loadSeason: vi.fn() }))

// Mock router.js to prevent popstate side effects
vi.mock('../router.js', () => ({ init: vi.fn() }))

describe('app integration', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = '<div id="app"></div>'
  })

  it('renders page layout on season-loaded with data', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    set('season', { id: '2025-2026' })
    const main = document.querySelector('.w-page-layout')
    expect(main).not.toBeNull()
    expect(main.tagName).toBe('MAIN')
  })

  it('shows fallback message when season is null', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    set('season', null)
    const fallback = document.querySelector('.w-empty-state')
    expect(fallback).not.toBeNull()
    expect(fallback.textContent).toContain('Les donnees arrivent lundi')
  })
})
