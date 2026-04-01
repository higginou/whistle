// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../components/zone-group.js', () => ({ render: vi.fn() }))

import { set, reset } from '../store.js'
import { render } from '../components/tab-projection.js'
import { render as renderZoneGroups } from '../components/zone-group.js'

const MOCK_SEASON = {
  matchday: 18,
  teams: [
    { id: 'toulouse', name: 'Toulouse', currentRank: 1, projectedRank: 1, elo: 1600, confidence: 0.85, zones: {}, form: [], trend: 'stable' },
    { id: 'la-rochelle', name: 'La Rochelle', currentRank: 3, projectedRank: 2, elo: 1575, confidence: 0.70, zones: {}, form: [], trend: 'up' },
    { id: 'bordeaux', name: 'Bordeaux', currentRank: 2, projectedRank: 3, elo: 1560, confidence: 0.55, zones: {}, form: [], trend: 'down' },
  ],
}

describe('tab-projection', () => {
  let container

  beforeEach(() => {
    reset()
    set('viewMode', 'detaille')
    renderZoneGroups.mockClear()
    container = document.createElement('div')
    render(container, MOCK_SEASON)
  })

  it('renders the season progress indicator', () => {
    const indicator = container.querySelector('.w-projection-progress')
    expect(indicator).not.toBeNull()
    expect(indicator.textContent).toContain('18')
    expect(indicator.textContent).toContain('26')
  })

  it('shows confiance globale as percentage', () => {
    // Mean of 0.85 + 0.70 + 0.55 = 0.70 → 70%
    const indicator = container.querySelector('.w-projection-progress')
    expect(indicator.textContent).toContain('70')
  })

  it('calls renderZoneGroups with teams sorted by projectedRank', () => {
    expect(renderZoneGroups).toHaveBeenCalledTimes(1)
    const teams = renderZoneGroups.mock.calls[0][1]
    expect(teams[0].projectedRank).toBe(1)
    expect(teams[1].projectedRank).toBe(2)
    expect(teams[2].projectedRank).toBe(3)
  })

  it('remaps projectedRank onto currentRank for zone groups', () => {
    const teams = renderZoneGroups.mock.calls[0][1]
    expect(teams[0].currentRank).toBe(1) // projectedRank 1 → currentRank 1
    expect(teams[1].currentRank).toBe(2) // projectedRank 2 → currentRank 2
    expect(teams[2].currentRank).toBe(3) // projectedRank 3 → currentRank 3
  })

  it('does NOT render a reveal button', () => {
    expect(container.querySelector('.w-reveal-btn')).toBeNull()
  })
})
