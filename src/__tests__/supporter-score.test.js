// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SEASON = {
  id: '2025-2026',
  lastUpdated: '2026-04-12T08:00:00Z',
  teams: [
    {
      id: 'la-rochelle',
      currentRank: 9,
      projectedRank: 6,
      confidence: 0.72,
    },
  ],
}

describe('supporter-score', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('hydrates the score from localStorage', async () => {
    const { get } = await import('../store.js')
    localStorage.setItem('w-supporter-score', '27')
    const { initSupporterScore } = await import('../supporter-score.js')

    initSupporterScore()

    expect(get('supporterScore')).toBe(27)
  })

  it('awards simple bonuses for consultation, simulation, and reveal', async () => {
    const { get, set } = await import('../store.js')
    const { initSupporterScore } = await import('../supporter-score.js')

    initSupporterScore()
    set('season', SEASON)

    const base = get('supporterScore')

    set('activeTab', 'projection')
    expect(get('supporterScore')).toBe(base)

    set('activeTab', 'duels')
    expect(get('supporterScore')).toBe(base + 1)

    set('selectedTeam', 'bayonne')
    expect(get('supporterScore')).toBe(base + 2)

    set('simulationMode', true)
    expect(get('supporterScore')).toBe(base + 5)

    set('revealed', true)
    expect(get('supporterScore')).toBe(base + 9)
    expect(localStorage.getItem('w-supporter-score')).toBe(String(base + 9))
  })

  it('does not reward the same tab twice in one session', async () => {
    const { get, set } = await import('../store.js')
    const { initSupporterScore } = await import('../supporter-score.js')

    initSupporterScore()
    set('season', SEASON)

    const base = get('supporterScore')
    set('activeTab', 'oracle')
    set('activeTab', 'classements')
    set('activeTab', 'oracle')

    expect(get('supporterScore')).toBe(base + 1)
  })
})
