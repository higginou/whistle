// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { set, reset } from '../store.js'
import { render, buildTiebreakerGroups, computeTeamH2HBalance } from '../components/tab-duels.js'

const MOCK_SEASON_WITH_H2H = {
  matchday: 18,
  teams: [
    { id: 'toulouse', name: 'Toulouse', currentRank: 1, elo: 1600, confidence: 0.85, zones: {}, form: [], trend: 'stable' },
    { id: 'la-rochelle', name: 'La Rochelle', currentRank: 5, elo: 1550, confidence: 0.70, zones: {}, form: [], trend: 'up', tiebreaker: 'h2h-1' },
    { id: 'bordeaux-begles', name: 'Bordeaux-Begles', currentRank: 6, elo: 1545, confidence: 0.68, zones: {}, form: [], trend: 'down', tiebreaker: 'h2h-1' },
    { id: 'vannes', name: 'Vannes', currentRank: 14, elo: 1275, confidence: 0.25, zones: {}, form: [], trend: 'down', promoted: true },
  ],
  headToHead: [
    {
      teams: ['bordeaux-begles', 'la-rochelle'],
      matches: [
        { matchday: 5, home: 'la-rochelle', away: 'bordeaux-begles', scoreHome: 24, scoreAway: 18 },
        { matchday: 15, home: 'bordeaux-begles', away: 'la-rochelle', scoreHome: 12, scoreAway: 20 },
      ],
      record: {
        'la-rochelle': { w: 2, d: 0, l: 0 },
        'bordeaux-begles': { w: 0, d: 0, l: 2 },
      },
    },
  ],
}

const MOCK_SEASON_NO_H2H = {
  matchday: 5,
  teams: [
    { id: 'toulouse', name: 'Toulouse', currentRank: 1, elo: 1600, confidence: 0.85, zones: {}, form: [], trend: 'stable' },
  ],
  headToHead: [],
}

describe('tab-duels', () => {
  let container

  beforeEach(() => {
    reset()
    container = document.createElement('div')
  })

  describe('buildTiebreakerGroups', () => {
    it('returns groups of tied teams with h2h data', () => {
      const groups = buildTiebreakerGroups(MOCK_SEASON_WITH_H2H)
      expect(groups).toHaveLength(1)
      expect(groups[0].teams).toHaveLength(2)
      expect(groups[0].teams[0].id).toBe('la-rochelle')
      expect(groups[0].teams[1].id).toBe('bordeaux-begles')
      expect(groups[0].h2hEntries).toHaveLength(1)
    })

    it('returns empty array when no tiebreaker teams', () => {
      const groups = buildTiebreakerGroups(MOCK_SEASON_NO_H2H)
      expect(groups).toHaveLength(0)
    })

    it('returns empty array when headToHead is missing', () => {
      const groups = buildTiebreakerGroups({ teams: [], headToHead: undefined })
      expect(groups).toHaveLength(0)
    })

    it('splits different tiebreaker groups correctly', () => {
      const season = {
        teams: [
          { id: 'a', name: 'A', currentRank: 3, tiebreaker: 'h2h-1' },
          { id: 'b', name: 'B', currentRank: 4, tiebreaker: 'h2h-1' },
          { id: 'c', name: 'C', currentRank: 8, tiebreaker: 'h2h-2' },
          { id: 'd', name: 'D', currentRank: 9, tiebreaker: 'h2h-2' },
        ],
        headToHead: [],
      }
      const groups = buildTiebreakerGroups(season)
      expect(groups).toHaveLength(2)
      expect(groups[0].teams.map((t) => t.id)).toEqual(['a', 'b'])
      expect(groups[1].teams.map((t) => t.id)).toEqual(['c', 'd'])
    })
  })

  describe('computeTeamH2HBalance', () => {
    it('sums wins/draws/losses across entries', () => {
      const bal = computeTeamH2HBalance('la-rochelle', MOCK_SEASON_WITH_H2H.headToHead)
      expect(bal).toEqual({ w: 2, d: 0, l: 0 })
    })

    it('returns zeros for team not in any entry', () => {
      const bal = computeTeamH2HBalance('toulouse', MOCK_SEASON_WITH_H2H.headToHead)
      expect(bal).toEqual({ w: 0, d: 0, l: 0 })
    })
  })

  describe('render — mode simple', () => {
    beforeEach(() => {
      set('viewMode', 'simple')
      render(container, MOCK_SEASON_WITH_H2H)
    })

    it('renders the page heading', () => {
      expect(container.querySelector('.w-duels-header__heading').textContent).toBe('Duels')
    })

    it('renders a tiebreaker group', () => {
      const groups = container.querySelectorAll('.w-group')
      expect(groups.length).toBe(1)
    })

    it('renders mini-rank rows for tied teams', () => {
      const rows = container.querySelectorAll('.w-mini-rank__row')
      expect(rows.length).toBe(2)
    })

    it('highlights la-rochelle as favorite', () => {
      const favName = container.querySelector('.w-mini-rank__name--favorite')
      expect(favName).not.toBeNull()
      expect(favName.textContent).toContain('La Rochelle')
    })

    it('does not render h2h table in simple mode', () => {
      expect(container.querySelector('.w-h2h-table')).toBeNull()
    })
  })

  describe('render — mode detaille', () => {
    beforeEach(() => {
      set('viewMode', 'detaille')
      render(container, MOCK_SEASON_WITH_H2H)
    })

    it('renders h2h table', () => {
      expect(container.querySelector('.w-h2h-table')).not.toBeNull()
    })

    it('table has correct column headers', () => {
      const headers = container.querySelectorAll('.w-h2h-table th')
      expect(headers.length).toBe(5)
      expect(headers[0].textContent).toBe('Equipe')
    })

    it('does not render mini-rank in detailed mode', () => {
      expect(container.querySelector('.w-mini-rank')).toBeNull()
    })
  })

  describe('render — no tiebreaker data', () => {
    it('shows empty state when no headToHead', () => {
      set('viewMode', 'simple')
      render(container, MOCK_SEASON_NO_H2H)
      const empty = container.querySelector('.w-duels-empty')
      expect(empty).not.toBeNull()
      expect(empty.textContent).toContain('Aucun departage')
    })
  })

  describe('render — promoted team note', () => {
    it('shows promoted note when a team has promoted flag', () => {
      set('viewMode', 'simple')
      render(container, MOCK_SEASON_WITH_H2H)
      const note = container.querySelector('.w-promoted-note')
      expect(note).not.toBeNull()
      expect(note.textContent).toContain('Vannes')
    })

    it('does not show promoted note when no promoted teams', () => {
      set('viewMode', 'simple')
      render(container, MOCK_SEASON_NO_H2H)
      expect(container.querySelector('.w-promoted-note')).toBeNull()
    })
  })

  describe('accessibility', () => {
    it('groups have aria-label', () => {
      set('viewMode', 'simple')
      render(container, MOCK_SEASON_WITH_H2H)
      const group = container.querySelector('.w-group')
      expect(group.getAttribute('aria-label')).toContain('Egalite')
    })

    it('mini-rank has role="list"', () => {
      set('viewMode', 'simple')
      render(container, MOCK_SEASON_WITH_H2H)
      const list = container.querySelector('.w-mini-rank')
      expect(list.getAttribute('role')).toBe('list')
    })

    it('promoted note has aria-label describing promoted teams', () => {
      set('viewMode', 'simple')
      render(container, MOCK_SEASON_WITH_H2H)
      const note = container.querySelector('.w-promoted-note')
      expect(note.getAttribute('aria-label')).toContain('promue')
    })

    it('promoted note has role="note"', () => {
      set('viewMode', 'simple')
      render(container, MOCK_SEASON_WITH_H2H)
      const note = container.querySelector('.w-promoted-note')
      expect(note.getAttribute('role')).toBe('note')
    })
  })
})
