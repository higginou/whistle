// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { reset, set, get } from '../store.js'
import {
  render,
  extractTeam,
  filterUpcomingMatches,
  toPercent,
  generateExplanation,
} from '../components/score-card.js'

const MOCK_SEASON = {
  season: '2025-2026',
  lastUpdated: '2026-03-29T08:50:25Z',
  matchday: 20,
  teams: [
    {
      id: 'toulouse',
      name: 'Stade Toulousain',
      currentRank: 1,
      projectedRank: 4,
      elo: 1514,
      confidence: 0.46,
      zones: { europe: 0, top6: 1, mid: 0, relegation: 0 },
      form: ['W'],
      trend: 'stable',
    },
    {
      id: 'la-rochelle',
      name: 'Stade Rochelais',
      currentRank: 9,
      projectedRank: 10,
      elo: 1487,
      confidence: 0.46,
      zones: { europe: 0, top6: 0, mid: 1, relegation: 0 },
      form: ['L'],
      trend: 'stable',
    },
    {
      id: 'bayonne',
      name: 'Aviron Bayonnais',
      currentRank: 10,
      projectedRank: 6,
      elo: 1513,
      confidence: 0.46,
      zones: { europe: 0, top6: 0.88, mid: 0.12, relegation: 0 },
      form: ['W'],
      trend: 'stable',
    },
  ],
  calendar: [
    {
      matchday: 21,
      date: '2026-04-05',
      home: 'toulouse',
      away: 'la-rochelle',
      difficulty: 0.8,
    },
    {
      matchday: 22,
      date: '2026-04-12',
      home: 'la-rochelle',
      away: 'bayonne',
      difficulty: 0.4,
    },
    {
      matchday: 19,
      date: '2026-03-22',
      home: 'la-rochelle',
      away: 'toulouse',
      homeScore: 20,
      awayScore: 25,
      difficulty: 0.9,
    },
    {
      matchday: 23,
      date: '2026-04-19',
      home: 'bayonne',
      away: 'la-rochelle',
      difficulty: 0.5,
    },
    {
      matchday: 24,
      date: '2026-04-26',
      home: 'la-rochelle',
      away: 'toulouse',
      difficulty: 0.9,
    },
  ],
  predictions: [],
}

describe('score-card', () => {
  beforeEach(() => {
    reset()
  })

  describe('extractTeam', () => {
    it('returns La Rochelle from teams array', () => {
      const team = extractTeam(MOCK_SEASON)
      expect(team).not.toBeNull()
      expect(team.id).toBe('la-rochelle')
      expect(team.name).toBe('Stade Rochelais')
    })

    it('returns null when season is null', () => {
      expect(extractTeam(null)).toBeNull()
    })

    it('returns null when teams array is missing', () => {
      expect(extractTeam({ season: '2025-2026' })).toBeNull()
    })

    it('returns null when la-rochelle is not in teams', () => {
      const season = { teams: [{ id: 'toulouse' }] }
      expect(extractTeam(season)).toBeNull()
    })
  })

  describe('toPercent', () => {
    it('converts 0 to 0%', () => {
      expect(toPercent(0)).toBe('0%')
    })

    it('converts 1 to 100%', () => {
      expect(toPercent(1)).toBe('100%')
    })

    it('converts 0.46 to 46%', () => {
      expect(toPercent(0.46)).toBe('46%')
    })

    it('rounds decimals', () => {
      expect(toPercent(0.8794)).toBe('88%')
    })
  })

  describe('filterUpcomingMatches', () => {
    it('returns only unplayed matches involving la-rochelle', () => {
      const matches = filterUpcomingMatches(MOCK_SEASON.calendar)
      expect(matches.length).toBe(3)
      for (const m of matches) {
        expect(m.home === 'la-rochelle' || m.away === 'la-rochelle').toBe(true)
        expect(m.homeScore).toBeUndefined()
        expect(m.awayScore).toBeUndefined()
      }
    })

    it('returns at most 3 matches', () => {
      const matches = filterUpcomingMatches(MOCK_SEASON.calendar)
      expect(matches.length).toBeLessThanOrEqual(3)
    })

    it('excludes played matches', () => {
      const matches = filterUpcomingMatches(MOCK_SEASON.calendar)
      const playedMatch = matches.find((m) => m.matchday === 19)
      expect(playedMatch).toBeUndefined()
    })

    it('returns empty array for null calendar', () => {
      expect(filterUpcomingMatches(null)).toEqual([])
    })
  })

  describe('generateExplanation', () => {
    it('generates text containing rank and elo', () => {
      const team = extractTeam(MOCK_SEASON)
      const text = generateExplanation(team, MOCK_SEASON.teams)
      expect(text).toContain('9e')
      expect(text).toContain('1487')
    })

    it('mentions projection', () => {
      const team = extractTeam(MOCK_SEASON)
      const text = generateExplanation(team, MOCK_SEASON.teams)
      expect(text).toContain('10e')
      expect(text).toMatch(/Projection/)
    })

    it('reflects stable trend', () => {
      const team = extractTeam(MOCK_SEASON)
      const text = generateExplanation(team, MOCK_SEASON.teams)
      expect(text).toContain('stable')
    })
  })

  describe('render', () => {
    let container

    beforeEach(() => {
      container = document.createElement('section')
      document.body.appendChild(container)
    })

    it('creates an article with w-score-card class', () => {
      render(container)
      const article = container.querySelector('article.w-score-card')
      expect(article).not.toBeNull()
    })

    it('renders h1 with team name when season data is set', () => {
      set('season', MOCK_SEASON)
      render(container)
      const h1 = container.querySelector('h1.w-score-card__team-name')
      expect(h1).not.toBeNull()
      expect(h1.textContent).toBe('Stade Rochelais')
    })

    it('renders positions', () => {
      set('season', MOCK_SEASON)
      render(container)
      const posNums = container.querySelectorAll('.w-mini-card__pos-num')
      expect(posNums.length).toBe(2)
    })

    it('renders trend indicator', () => {
      set('season', MOCK_SEASON)
      render(container)
      const trend = container.querySelector('.w-mini-card--tendance')
      expect(trend).not.toBeNull()
    })

    it('renders XP bar with aria-label', () => {
      set('season', MOCK_SEASON)
      render(container)
      const xp = container.querySelector('.w-mini-card--xp')
      expect(xp).not.toBeNull()
      expect(xp.getAttribute('aria-label')).toContain('Probabilite top 6')
    })

    it('renders badge slot container', () => {
      set('season', MOCK_SEASON)
      render(container)
      const badge = container.querySelector('.w-score-card__badge-slot')
      expect(badge).not.toBeNull()
    })

    it('renders supporter score panel', () => {
      set('season', MOCK_SEASON)
      set('supporterScore', 42)
      render(container)
      const supporter = container.querySelector('.w-score-card__supporter')
      expect(supporter).not.toBeNull()
      expect(supporter.textContent).toContain('42')
      expect(supporter.textContent).toContain('Supporter')
    })

    it('renders match pills', () => {
      set('season', MOCK_SEASON)
      render(container)
      const pills = container.querySelectorAll('.w-match-pill')
      expect(pills.length).toBe(3)
    })

    it('renders explanation text', () => {
      set('season', MOCK_SEASON)
      render(container)
      const text = container.querySelector('.w-mini-card__explication-text')
      expect(text).not.toBeNull()
      expect(text.textContent.length).toBeGreaterThan(0)
    })

    it('toggles zones on XP card click', () => {
      set('season', MOCK_SEASON)
      render(container)
      const xp = container.querySelector('.w-mini-card--xp')
      const zones = container.querySelector('.w-mini-card__zones')
      expect(zones.classList.contains('is-open')).toBe(false)
      xp.click()
      expect(zones.classList.contains('is-open')).toBe(true)
      xp.click()
      expect(zones.classList.contains('is-open')).toBe(false)
    })
  })
})
