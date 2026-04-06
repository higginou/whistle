// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock store and router before importing rank-row
vi.mock('../src/store.js', () => ({
  set: vi.fn(),
  get: vi.fn((key) => key === 'viewMode' ? 'detaille' : undefined),
}))
vi.mock('../src/router.js', () => ({
  pushSheet: vi.fn(),
}))
// Stub confidence-bar (DOM-only, not under test)
vi.mock('../src/components/confidence-bar.js', () => ({
  render: vi.fn(),
}))
// CSS import is a no-op in vitest/jsdom
vi.mock('../src/styles/components/rank-row.css', () => ({}))

import { render } from '../src/components/rank-row.js'
import { set } from '../src/store.js'
import { pushSheet } from '../src/router.js'

/** Minimal team object */
function makeTeam(overrides = {}) {
  return {
    id: 'la-rochelle',
    name: 'Stade Rochelais',
    currentRank: 4,
    elo: 1582,
    points: 50,
    confidence: 0.74,
    trend: 'up',
    ...overrides,
  }
}

describe('rank-row — tap interaction', () => {
  let ul

  beforeEach(() => {
    vi.clearAllMocks()
    ul = document.createElement('ul')
  })

  it('click triggers set(selectedTeam) and pushSheet(team-detail)', () => {
    const team = makeTeam({ id: 'toulouse' })
    render(ul, team)

    const row = ul.querySelector('.w-rank-row')
    row.click()

    expect(set).toHaveBeenCalledWith('selectedTeam', 'toulouse')
    expect(pushSheet).toHaveBeenCalledWith('team-detail')
  })

  it('rendered row has role="button" and tabindex="0"', () => {
    render(ul, makeTeam())

    const row = ul.querySelector('.w-rank-row')
    expect(row.getAttribute('role')).toBe('button')
    expect(row.getAttribute('tabindex')).toBe('0')
  })

  it('pointerdown adds is-pressed, pointerup removes it', () => {
    render(ul, makeTeam())

    const row = ul.querySelector('.w-rank-row')

    row.dispatchEvent(new Event('pointerdown'))
    expect(row.classList.contains('is-pressed')).toBe(true)

    row.dispatchEvent(new Event('pointerup'))
    expect(row.classList.contains('is-pressed')).toBe(false)
  })
})

describe('rank-row — promoted badge', () => {
  let ul

  beforeEach(() => {
    vi.clearAllMocks()
    ul = document.createElement('ul')
  })

  it('shows promu tag when team.promoted is true', () => {
    render(ul, makeTeam({ promoted: true }))
    const badge = ul.querySelector('.w-rank-row__promu')
    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe('P')
    expect(badge.getAttribute('aria-label')).toContain('promue')
  })

  it('does not show promu tag when team has no promoted flag', () => {
    render(ul, makeTeam())
    expect(ul.querySelector('.w-rank-row__promu')).toBeNull()
  })
})
