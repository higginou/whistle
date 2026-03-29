import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeAchievements,
  ACHIEVEMENT_PREDICTION,
  ACHIEVEMENT_EXPLANATION,
  ACHIEVEMENT_SURPRISE,
} from '../src/components/achievement-card.js'

/** Minimal team factory */
function makeTeam(id, rank, overrides = {}) {
  return {
    id,
    name: id.replace(/-/g, ' '),
    currentRank: rank,
    projectedRank: rank,
    elo: 1500,
    confidence: 0.5,
    trend: 'stable',
    ...overrides,
  }
}

function make14Teams(overrides = {}) {
  const names = [
    'toulouse', 'bordeaux', 'la-rochelle', 'toulon', 'clermont',
    'racing-92', 'lyon', 'castres', 'montpellier', 'pau',
    'perpignan', 'bayonne', 'vannes', 'grenoble',
  ]
  return names.map((name, i) => makeTeam(name, i + 1, name === 'la-rochelle' ? overrides : {}))
}

/** Build a season object with predictions history */
function makeSeason({ teams, predictions = [], matchday = 20 }) {
  return { id: '2025-2026', matchday, brierScore: 0.18, teams, predictions, calendar: [] }
}

/** Build a prediction entry */
function makePrediction(matchday, projections) {
  return { matchday, date: '2026-03-20', projections }
}

describe('achievement-card — computeAchievements', () => {
  describe('prediction card', () => {
    it('shows prediction card with correct ratio when predictions.length >= 2', () => {
      const teams = make14Teams()
      // Previous prediction: la-rochelle projected 3rd, currently 3rd → correct
      const prevProjections = teams.map((t) => ({
        teamId: t.id,
        projectedRank: t.currentRank, // all correct
        confidence: 0.8,
      }))
      const season = makeSeason({
        teams,
        predictions: [
          makePrediction(19, prevProjections),
          makePrediction(20, prevProjections),
        ],
      })

      const cards = computeAchievements(season)
      const pred = cards.find((c) => c.type === ACHIEVEMENT_PREDICTION)

      expect(pred).toBeDefined()
      expect(pred.ratio).toEqual({ correct: 14, total: 14 })
    })

    it('counts predictions within tolerance of 1 as correct', () => {
      const teams = make14Teams()
      // Previous: all teams projected exactly at their rank except la-rochelle off by 1
      const prevProjections = teams.map((t) => ({
        teamId: t.id,
        projectedRank: t.id === 'la-rochelle' ? t.currentRank + 1 : t.currentRank,
        confidence: 0.8,
      }))
      const season = makeSeason({
        teams,
        predictions: [
          makePrediction(19, prevProjections),
          makePrediction(20, []),
        ],
      })

      const cards = computeAchievements(season)
      const pred = cards.find((c) => c.type === ACHIEVEMENT_PREDICTION)

      // la-rochelle off by 1 → still within tolerance
      expect(pred.ratio.correct).toBe(14)
    })
  })

  describe('explanation card', () => {
    it('shows explanation card when La Rochelle trend is "up"', () => {
      const teams = make14Teams({ trend: 'up', projectedRank: 1 })
      const season = makeSeason({ teams })

      const cards = computeAchievements(season)
      const expl = cards.find((c) => c.type === ACHIEVEMENT_EXPLANATION)

      expect(expl).toBeDefined()
      expect(expl.title).toContain('grimpe')
    })

    it('shows explanation card when La Rochelle trend is "down"', () => {
      const teams = make14Teams({ trend: 'down', projectedRank: 6 })
      const season = makeSeason({ teams })

      const cards = computeAchievements(season)
      const expl = cards.find((c) => c.type === ACHIEVEMENT_EXPLANATION)

      expect(expl).toBeDefined()
      expect(expl.title).toContain('recule')
    })

    it('shows explanation card when La Rochelle trend is "stable"', () => {
      const teams = make14Teams({ trend: 'stable' })
      const season = makeSeason({ teams })

      const cards = computeAchievements(season)
      const expl = cards.find((c) => c.type === ACHIEVEMENT_EXPLANATION)

      expect(expl).toBeDefined()
      expect(expl.title).toContain('maintient')
    })
  })

  describe('first matchday (predictions.length <= 1)', () => {
    it('only shows explanation card, no prediction or surprise', () => {
      const teams = make14Teams({ trend: 'up', projectedRank: 1 })
      const season = makeSeason({ teams, predictions: [] })

      const cards = computeAchievements(season)

      expect(cards.find((c) => c.type === ACHIEVEMENT_EXPLANATION)).toBeDefined()
      expect(cards.find((c) => c.type === ACHIEVEMENT_PREDICTION)).toBeUndefined()
      expect(cards.find((c) => c.type === ACHIEVEMENT_SURPRISE)).toBeUndefined()
    })

    it('only shows explanation with single prediction entry', () => {
      const teams = make14Teams({ trend: 'down', projectedRank: 5 })
      const season = makeSeason({
        teams,
        predictions: [makePrediction(20, [])],
      })

      const cards = computeAchievements(season)

      expect(cards).toHaveLength(1)
      expect(cards[0].type).toBe(ACHIEVEMENT_EXPLANATION)
    })
  })

  describe('surprise card', () => {
    it('shows surprise card when a team has gap >= 3 between projection and reality', () => {
      const teams = make14Teams()
      // Previous: castres projected 8th, but currently 8th...
      // Let's make castres currently rank 4 but was projected 8th
      teams.find((t) => t.id === 'castres').currentRank = 4
      const prevProjections = teams.map((t) => ({
        teamId: t.id,
        projectedRank: t.id === 'castres' ? 8 : t.currentRank,
        confidence: 0.8,
      }))
      const season = makeSeason({
        teams,
        predictions: [
          makePrediction(19, prevProjections),
          makePrediction(20, []),
        ],
      })

      const cards = computeAchievements(season)
      const surprise = cards.find((c) => c.type === ACHIEVEMENT_SURPRISE)

      expect(surprise).toBeDefined()
      expect(surprise.description).toContain('castres')
    })

    it('does not show surprise card when all gaps < 3', () => {
      const teams = make14Teams()
      const prevProjections = teams.map((t) => ({
        teamId: t.id,
        projectedRank: t.currentRank, // all exact
        confidence: 0.8,
      }))
      const season = makeSeason({
        teams,
        predictions: [
          makePrediction(19, prevProjections),
          makePrediction(20, []),
        ],
      })

      const cards = computeAchievements(season)
      expect(cards.find((c) => c.type === ACHIEVEMENT_SURPRISE)).toBeUndefined()
    })
  })

  describe('accessibility', () => {
    it('each card object has type and ariaLabel', () => {
      const teams = make14Teams({ trend: 'up', projectedRank: 1 })
      // Create a surprise scenario too
      teams.find((t) => t.id === 'castres').currentRank = 1
      const prevProjections = teams.map((t) => ({
        teamId: t.id,
        projectedRank: t.id === 'castres' ? 8 : t.currentRank,
        confidence: 0.8,
      }))
      const season = makeSeason({
        teams,
        predictions: [
          makePrediction(19, prevProjections),
          makePrediction(20, []),
        ],
      })

      const cards = computeAchievements(season)
      for (const card of cards) {
        expect(card.type).toBeDefined()
        expect(card.ariaLabel).toBeTruthy()
      }
    })
  })

  describe('CSS variant classes', () => {
    it('prediction card has cssClass "--prediction"', () => {
      const teams = make14Teams()
      const prevProjections = teams.map((t) => ({
        teamId: t.id,
        projectedRank: t.currentRank,
        confidence: 0.8,
      }))
      const season = makeSeason({
        teams,
        predictions: [
          makePrediction(19, prevProjections),
          makePrediction(20, []),
        ],
      })

      const cards = computeAchievements(season)
      const pred = cards.find((c) => c.type === ACHIEVEMENT_PREDICTION)
      expect(pred.cssClass).toBe('w-achievement--prediction')
    })

    it('explanation card has cssClass "--explication"', () => {
      const teams = make14Teams({ trend: 'up', projectedRank: 1 })
      const season = makeSeason({ teams })

      const cards = computeAchievements(season)
      const expl = cards.find((c) => c.type === ACHIEVEMENT_EXPLANATION)
      expect(expl.cssClass).toBe('w-achievement--explication')
    })

    it('surprise card has cssClass "--surprise"', () => {
      const teams = make14Teams()
      teams.find((t) => t.id === 'castres').currentRank = 4
      const prevProjections = teams.map((t) => ({
        teamId: t.id,
        projectedRank: t.id === 'castres' ? 8 : t.currentRank,
        confidence: 0.8,
      }))
      const season = makeSeason({
        teams,
        predictions: [
          makePrediction(19, prevProjections),
          makePrediction(20, []),
        ],
      })

      const cards = computeAchievements(season)
      const surprise = cards.find((c) => c.type === ACHIEVEMENT_SURPRISE)
      expect(surprise.cssClass).toBe('w-achievement--surprise')
    })
  })
})
