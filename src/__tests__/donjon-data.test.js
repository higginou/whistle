// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { normalizeMatch, normalizeMatches, deriveMagnitude, findNextOpponent, buildTeamsMap } from '../components/donjon-data.js'

const TEAMS_MAP = new Map([
  ['perpignan', 'USA Perpignan'],
  ['bordeaux-begles', 'Union Bordeaux-Begles'],
  ['toulouse', 'Stade Toulousain'],
])

describe('donjon-data', () => {
  describe('deriveMagnitude', () => {
    it('returns "large" for gap >= 16', () => {
      expect(deriveMagnitude(31, 8)).toBe('large')
    })
    it('returns "medium" for gap 8-15', () => {
      expect(deriveMagnitude(25, 15)).toBe('medium')
    })
    it('returns "close" for gap <= 7', () => {
      expect(deriveMagnitude(20, 18)).toBe('close')
    })
    it('returns "close" for exact gap of 7', () => {
      expect(deriveMagnitude(20, 13)).toBe('close')
    })
    it('returns "medium" for exact gap of 8', () => {
      expect(deriveMagnitude(20, 12)).toBe('medium')
    })
    it('returns "medium" for exact gap of 15', () => {
      expect(deriveMagnitude(25, 10)).toBe('medium')
    })
    it('returns "large" for exact gap of 16', () => {
      expect(deriveMagnitude(26, 10)).toBe('large')
    })
  })

  describe('normalizeMatch', () => {
    it('normalizes a home match for LR', () => {
      const raw = {
        matchday: 4, date: '2025-09-27',
        home: 'la-rochelle', away: 'perpignan',
        homeScore: 31, awayScore: 8,
        homeTries: 4, awayTries: 1,
        homeBonus: { offensive: true, defensive: false },
        awayBonus: { offensive: false, defensive: false },
      }
      const result = normalizeMatch(raw, TEAMS_MAP)
      expect(result.isHome).toBe(true)
      expect(result.opponent).toEqual({ id: 'perpignan', name: 'USA Perpignan' })
      expect(result.score).toEqual({ lr: 31, opponent: 8 })
      expect(result.tries).toEqual({ lr: 4, opponent: 1 })
      expect(result.bonus.lr).toEqual({ offensive: true, defensive: false })
      expect(result.result).toBe('win')
      expect(result.magnitude).toBe('large')
    })

    it('normalizes an away match for LR', () => {
      const raw = {
        matchday: 1, date: '2025-09-06',
        home: 'bordeaux-begles', away: 'la-rochelle',
        homeScore: 23, awayScore: 18,
        homeTries: 2, awayTries: 2,
        homeBonus: { offensive: false, defensive: false },
        awayBonus: { offensive: false, defensive: true },
      }
      const result = normalizeMatch(raw, TEAMS_MAP)
      expect(result.isHome).toBe(false)
      expect(result.opponent).toEqual({ id: 'bordeaux-begles', name: 'Union Bordeaux-Begles' })
      expect(result.score).toEqual({ lr: 18, opponent: 23 })
      expect(result.result).toBe('loss')
      expect(result.magnitude).toBe('close')
      expect(result.bonus.lr).toEqual({ offensive: false, defensive: true })
    })

    it('normalizes a draw', () => {
      const raw = {
        matchday: 10, date: '2025-11-15',
        home: 'la-rochelle', away: 'toulouse',
        homeScore: 20, awayScore: 20,
        homeTries: 2, awayTries: 2,
        homeBonus: { offensive: false, defensive: false },
        awayBonus: { offensive: false, defensive: false },
      }
      const result = normalizeMatch(raw, TEAMS_MAP)
      expect(result.result).toBe('draw')
      expect(result.magnitude).toBe('close')
    })

    it('keeps try counts optional for Vercel public API results', () => {
      const raw = {
        matchday: 18, date: '2026-04-18T19:00:00Z',
        home: 'la-rochelle', away: 'toulouse',
        homeScore: 24, awayScore: 19,
        homeBonus: { offensive: true, defensive: false },
        awayBonus: { offensive: false, defensive: true },
      }

      const result = normalizeMatch(raw, TEAMS_MAP)

      expect(result.tries).toEqual({ lr: null, opponent: null })
      expect(result.score).toEqual({ lr: 24, opponent: 19 })
      expect(result.bonus.lr).toEqual({ offensive: true, defensive: false })
    })
  })

  describe('normalizeMatches', () => {
    it('filters LR matches and sorts by matchday', () => {
      const results = [
        { matchday: 3, home: 'toulouse', away: 'perpignan', homeScore: 30, awayScore: 10, homeTries: 4, awayTries: 1, homeBonus: { offensive: true, defensive: false }, awayBonus: { offensive: false, defensive: false } },
        { matchday: 1, home: 'bordeaux-begles', away: 'la-rochelle', homeScore: 23, awayScore: 18, homeTries: 2, awayTries: 2, homeBonus: { offensive: false, defensive: false }, awayBonus: { offensive: false, defensive: true } },
        { matchday: 4, home: 'la-rochelle', away: 'perpignan', homeScore: 31, awayScore: 8, homeTries: 4, awayTries: 1, homeBonus: { offensive: true, defensive: false }, awayBonus: { offensive: false, defensive: false } },
      ]
      const matches = normalizeMatches(results, TEAMS_MAP)
      expect(matches).toHaveLength(2)
      expect(matches[0].matchday).toBe(1)
      expect(matches[1].matchday).toBe(4)
    })
  })

  describe('findNextOpponent', () => {
    it('finds next LR match after last played', () => {
      const calendar = [
        { matchday: 21, date: '2026-04-18', home: 'la-rochelle', away: 'bordeaux-begles' },
        { matchday: 22, date: '2026-04-25', home: 'toulouse', away: 'la-rochelle' },
        { matchday: 23, date: '2026-05-02', home: 'perpignan', away: 'toulouse' },
      ]
      const result = findNextOpponent(calendar, 20, TEAMS_MAP)
      expect(result).toEqual({
        matchday: 21,
        date: '2026-04-18',
        opponent: { id: 'bordeaux-begles', name: 'Union Bordeaux-Begles' },
        isHome: true,
      })
    })

    it('returns null when no future LR matches', () => {
      const calendar = [
        { matchday: 23, date: '2026-05-02', home: 'perpignan', away: 'toulouse' },
      ]
      expect(findNextOpponent(calendar, 20, TEAMS_MAP)).toBeNull()
    })
  })

  describe('buildTeamsMap', () => {
    it('builds id → name map', () => {
      const teams = [
        { id: 'toulouse', name: 'Stade Toulousain' },
        { id: 'la-rochelle', name: 'Stade Rochelais' },
      ]
      const map = buildTeamsMap(teams)
      expect(map.get('toulouse')).toBe('Stade Toulousain')
      expect(map.get('la-rochelle')).toBe('Stade Rochelais')
    })
  })
})
