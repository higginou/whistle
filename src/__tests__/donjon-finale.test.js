// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { computeFinaleStats, computeRank } from '../components/donjon-finale.js'

const SAMPLE_MATCHES = [
  { matchday: 1, result: 'loss', score: { lr: 18, opponent: 23 }, tries: { lr: 2, opponent: 2 }, bonus: { lr: { offensive: false, defensive: true } }, opponent: { name: 'Bordeaux' } },
  { matchday: 2, result: 'win', score: { lr: 34, opponent: 16 }, tries: { lr: 4, opponent: 2 }, bonus: { lr: { offensive: false, defensive: false } }, opponent: { name: 'Clermont' } },
  { matchday: 4, result: 'win', score: { lr: 31, opponent: 8 }, tries: { lr: 4, opponent: 1 }, bonus: { lr: { offensive: true, defensive: false } }, opponent: { name: 'Perpignan' } },
  { matchday: 5, result: 'draw', score: { lr: 20, opponent: 20 }, tries: { lr: 2, opponent: 2 }, bonus: { lr: { offensive: false, defensive: false } }, opponent: { name: 'Toulouse' } },
]

describe('computeFinaleStats', () => {
  it('computes correct wins/losses/draws', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.wins).toBe(2)
    expect(stats.losses).toBe(1)
    expect(stats.draws).toBe(1)
  })
  it('finds best win by score gap', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.bestWin.score.lr).toBe(31)
    expect(stats.bestWin.opponent.name).toBe('Perpignan')
  })
  it('finds worst loss by score gap', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.worstLoss.score.lr).toBe(18)
    expect(stats.worstLoss.opponent.name).toBe('Bordeaux')
  })
  it('counts total tries', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.totalTries).toBe(12)
  })
  it('counts bonus offensifs', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.bonusOffensifs).toBe(1)
  })
  it('returns null worstLoss when no losses', () => {
    const allWins = [SAMPLE_MATCHES[1], SAMPLE_MATCHES[2]]
    expect(computeFinaleStats(allWins).worstLoss).toBeNull()
  })
  it('returns null bestWin when no wins', () => {
    const allLosses = [SAMPLE_MATCHES[0]]
    expect(computeFinaleStats(allLosses).bestWin).toBeNull()
  })
})

describe('computeRank', () => {
  it('returns LEGENDE for >= 85%', () => {
    expect(computeRank(18, 20)).toEqual({ title: 'LEGENDE', color: 'gold', tier: 5 })
  })
  it('returns GLADIATEUR for 70-84%', () => {
    expect(computeRank(15, 20)).toEqual({ title: 'GLADIATEUR', color: 'purple', tier: 4 })
  })
  it('returns GLADIATEUR for exact 70%', () => {
    expect(computeRank(14, 20)).toEqual({ title: 'GLADIATEUR', color: 'purple', tier: 4 })
  })
  it('returns CHEVALIER for 55-69%', () => {
    expect(computeRank(12, 20)).toEqual({ title: 'CHEVALIER', color: 'blue', tier: 3 })
  })
  it('returns ECUYER for 40-54%', () => {
    expect(computeRank(9, 20)).toEqual({ title: 'ECUYER', color: 'green', tier: 2 })
  })
  it('returns RECRUE for < 40%', () => {
    expect(computeRank(5, 20)).toEqual({ title: 'RECRUE', color: 'grey', tier: 1 })
  })
})
