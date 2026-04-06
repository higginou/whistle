// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { getVerdictTier } from '../components/donjon-verdict.js'

describe('getVerdictTier', () => {
  it('returns win-large for large win', () => {
    expect(getVerdictTier('win', 'large', { offensive: false, defensive: false })).toBe('win-large')
  })
  it('returns win-large when bonus offensif regardless of magnitude', () => {
    expect(getVerdictTier('win', 'close', { offensive: true, defensive: false })).toBe('win-large')
  })
  it('returns win-small for medium win without bonus off', () => {
    expect(getVerdictTier('win', 'medium', { offensive: false, defensive: false })).toBe('win-small')
  })
  it('returns win-small for close win without bonus off', () => {
    expect(getVerdictTier('win', 'close', { offensive: false, defensive: false })).toBe('win-small')
  })
  it('returns draw', () => {
    expect(getVerdictTier('draw', 'close', { offensive: false, defensive: false })).toBe('draw')
  })
  it('returns loss-small for close loss', () => {
    expect(getVerdictTier('loss', 'close', { offensive: false, defensive: false })).toBe('loss-small')
  })
  it('returns loss-small when bonus defensif regardless of magnitude', () => {
    expect(getVerdictTier('loss', 'large', { offensive: false, defensive: true })).toBe('loss-small')
  })
  it('returns loss-large for medium loss without bonus def', () => {
    expect(getVerdictTier('loss', 'medium', { offensive: false, defensive: false })).toBe('loss-large')
  })
  it('returns loss-large for large loss without bonus def', () => {
    expect(getVerdictTier('loss', 'large', { offensive: false, defensive: false })).toBe('loss-large')
  })
})
