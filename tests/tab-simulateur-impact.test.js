// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { set, get, on, reset } from '../src/store.js'

// Mock simulator-engine to avoid heavy Monte Carlo in tests
vi.mock('../src/simulator-engine.js', () => ({
  recalculateProjections: vi.fn(() => [
    { id: 'toulouse', name: 'Toulouse', currentRank: 1, projectedRank: 2, elo: 1580, zones: { europe: 0.5, top6: 0.3, mid: 0.15, relegation: 0.05 }, delta: { rank: 1, europe: -0.1, top6: 0.05, mid: 0.04, relegation: 0.01 } },
    { id: 'la-rochelle', name: 'La Rochelle', currentRank: 2, projectedRank: 1, elo: 1620, zones: { europe: 0.7, top6: 0.2, mid: 0.08, relegation: 0.02 }, delta: { rank: -1, europe: 0.1, top6: -0.05, mid: -0.04, relegation: -0.01 } },
  ]),
  matchKey: (match) => `${match.matchday}-${match.home}-${match.away}`,
}))

import { render, countSimulated, filterUpcoming } from '../src/components/tab-simulateur.js'

function makeSeason() {
  return {
    matchday: 20,
    teams: [
      { id: 'toulouse', name: 'Stade Toulousain', currentRank: 1, elo: 1600, projectedRank: 1, zones: { europe: 0.6, top6: 0.25, mid: 0.11, relegation: 0.04 } },
      { id: 'la-rochelle', name: 'Stade Rochelais', currentRank: 2, elo: 1550, projectedRank: 2, zones: { europe: 0.6, top6: 0.25, mid: 0.12, relegation: 0.03 } },
    ],
    calendar: [
      { matchday: 21, date: '2026-04-05T14:00:00Z', home: 'toulouse', away: 'la-rochelle', difficulty: 0.82 },
    ],
  }
}

describe('Impact button visibility', () => {
  let container

  beforeEach(() => {
    reset()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('does not show impact button when no match is simulated', () => {
    set('simulatedResults', {})
    render(container, makeSeason())
    expect(container.querySelector('.w-sim-impact-btn')).toBeNull()
  })

  it('shows impact button when >= 1 match is simulated', () => {
    set('simulatedResults', { '21-toulouse-la-rochelle': { outcome: 'homeWin', bonusOff: false, bonusDef: false } })
    render(container, makeSeason())
    expect(container.querySelector('.w-sim-impact-btn')).not.toBeNull()
  })

  it('button has descriptive aria-label', () => {
    set('simulatedResults', { '21-toulouse-la-rochelle': { outcome: 'draw', bonusOff: false, bonusDef: false } })
    render(container, makeSeason())
    const btn = container.querySelector('.w-sim-impact-btn')
    expect(btn.getAttribute('aria-label')).toContain('1 match(s)')
  })
})

describe('Impact button click', () => {
  let container

  beforeEach(() => {
    reset()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('calls recalculateProjections and sets store on click', async () => {
    set('simulatedResults', { '21-toulouse-la-rochelle': { outcome: 'homeWin', bonusOff: false, bonusDef: false } })
    render(container, makeSeason())
    const btn = container.querySelector('.w-sim-impact-btn')

    // Track store changes
    const changes = []
    on('simulationMode', (e) => changes.push(['simulationMode', e.detail.value]))
    on('simulatedStandings', (e) => changes.push(['simulatedStandings', e.detail.value]))

    btn.click()
    // Wait for the setTimeout(0) in handleImpact
    await new Promise((r) => setTimeout(r, 50))

    expect(get('simulationMode')).toBe(true)
    expect(get('simulatedStandings')).not.toBeNull()
    expect(get('activeTab')).toBe('classements')
  })
})

describe('Store: simulationMode and simulatedStandings', () => {
  beforeEach(() => reset())

  it('simulationMode defaults to false', () => {
    expect(get('simulationMode')).toBe(false)
  })

  it('simulatedStandings defaults to null', () => {
    expect(get('simulatedStandings')).toBeNull()
  })

  it('simulationMode set/get/on works', () => {
    const calls = []
    on('simulationMode', (e) => calls.push(e.detail.value))
    set('simulationMode', true)
    expect(get('simulationMode')).toBe(true)
    expect(calls).toEqual([true])
  })

  it('simulatedStandings set/get/on works', () => {
    const data = [{ id: 'test' }]
    set('simulatedStandings', data)
    expect(get('simulatedStandings')).toBe(data)
  })

  it('reset clears simulation state', () => {
    set('simulationMode', true)
    set('simulatedStandings', [{ id: 'test' }])
    reset()
    expect(get('simulationMode')).toBe(false)
    expect(get('simulatedStandings')).toBeNull()
  })
})
