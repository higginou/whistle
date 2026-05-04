// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('donjon orchestrator', () => {
  let container
  let render

  beforeEach(async () => {
    vi.resetModules()
    container = document.createElement('div')
    document.body.appendChild(container)
    const mod = await import('../components/tab-donjon.js')
    render = mod.render
  })

  afterEach(() => {
    container.remove()
  })

  const MOCK_SEASON = {
    matchday: 20,
    teams: [
      { id: 'la-rochelle', name: 'Stade Rochelais' },
      { id: 'perpignan', name: 'USA Perpignan' },
    ],
    calendar: [
      { matchday: 21, date: '2026-04-18', home: 'la-rochelle', away: 'perpignan' },
    ],
  }

  const MOCK_SEASON_WITH_RESULTS = {
    ...MOCK_SEASON,
    results: [
      {
        matchday: 1, date: '2025-09-06',
        home: 'la-rochelle', away: 'perpignan',
        homeScore: 31, awayScore: 8,
        homeTries: 4, awayTries: 1,
        homeBonus: { offensive: true, defensive: false },
        awayBonus: { offensive: false, defensive: false },
      },
    ],
  }

  it('starts in splash phase', () => {
    render(container, MOCK_SEASON_WITH_RESULTS)
    expect(container.querySelector('.w-donjon')).toBeTruthy()
    expect(container.querySelector('.w-donjon-splash')).toBeTruthy()
  })

  it('renders with empty Vercel match data without crashing', () => {
    render(container, { ...MOCK_SEASON, results: [] })
    expect(container.querySelector('.w-donjon-splash')).toBeTruthy()
    const counter = container.querySelector('.w-donjon-splash__counter')
    expect(counter.textContent).toContain('0')
  })

  it('renders without Vercel match data without crashing', () => {
    render(container, MOCK_SEASON)
    expect(container.querySelector('.w-donjon-splash')).toBeTruthy()
  })

  it('has mute button', () => {
    render(container, MOCK_SEASON_WITH_RESULTS)
    const muteBtn = container.querySelector('.w-donjon__mute')
    expect(muteBtn).toBeTruthy()
    expect(muteBtn.getAttribute('aria-label')).toBeTruthy()
  })
})
