// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../components/zone-group.js', () => ({
  render: vi.fn((container, teams) => {
    for (const team of teams) {
      const row = document.createElement('div')
      row.className = 'w-rank-row'
      row.dataset.teamId = team.id
      const pos = document.createElement('span')
      pos.className = 'w-rank-row__position'
      pos.textContent = String(team.currentRank)
      row.appendChild(pos)
      container.appendChild(row)
    }
  }),
}))

import { set, reset } from '../store.js'
import { render } from '../components/tab-projection.js'
import { render as renderZoneGroups } from '../components/zone-group.js'

const MOCK_SEASON = {
  matchday: 18,
  teams: [
    { id: 'toulouse', name: 'Toulouse', currentRank: 1, projectedRank: 1, elo: 1600, points: 60, projectedPoints: 82, confidence: 0.85, zones: {}, form: [], trend: 'stable' },
    { id: 'la-rochelle', name: 'La Rochelle', currentRank: 3, projectedRank: 2, elo: 1575, points: 52, projectedPoints: 75, confidence: 0.70, zones: {}, form: [], trend: 'up' },
    { id: 'bordeaux', name: 'Bordeaux', currentRank: 2, projectedRank: 3, elo: 1560, points: 55, projectedPoints: 71, confidence: 0.55, zones: {}, form: [], trend: 'down' },
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

  it('renders projection J-26 header with base matchday', () => {
    const indicator = container.querySelector('.w-projection-progress')
    expect(indicator.textContent).toContain('Projection')
    expect(indicator.textContent).toContain('J-26')
    expect(indicator.textContent).toContain('J-18')
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

  it('passes projectedPoints as points to zone groups', () => {
    const teams = renderZoneGroups.mock.calls[0][1]
    expect(teams[0].points).toBe(82)
    expect(teams[1].points).toBe(75)
    expect(teams[2].points).toBe(71)
  })

  it('computes rankDelta on each team', () => {
    const teams = renderZoneGroups.mock.calls[0][1]
    expect(teams[0].rankDelta).toBe(0)   // toulouse: 1→1
    expect(teams[1].rankDelta).toBe(1)   // la-rochelle: 3→2
    expect(teams[2].rankDelta).toBe(-1)  // bordeaux: 2→3
  })

  it('does NOT render a reveal button', () => {
    expect(container.querySelector('.w-reveal-btn')).toBeNull()
  })

  it('renders movement badge for team moving up', () => {
    const badge = container.querySelector('[data-team-id="la-rochelle"] .w-rank-delta')
    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe('+1')
    expect(badge.classList.contains('w-rank-delta--up')).toBe(true)
  })

  it('renders movement badge for team moving down', () => {
    const badge = container.querySelector('[data-team-id="bordeaux"] .w-rank-delta')
    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe('-1')
    expect(badge.classList.contains('w-rank-delta--down')).toBe(true)
  })

  it('does not render badge for team with no movement', () => {
    const badge = container.querySelector('[data-team-id="toulouse"] .w-rank-delta')
    expect(badge).toBeNull()
  })
})
