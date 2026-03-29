import { describe, it, expect } from 'vitest'
import { getConfidenceLevel } from '../src/components/confidence-bar.js'

describe('confidence-bar — getConfidenceLevel', () => {
  it('returns high for confidence > 0.70', () => {
    expect(getConfidenceLevel(0.75)).toEqual({ level: 'elevee', cls: 'high' })
    expect(getConfidenceLevel(0.92)).toEqual({ level: 'elevee', cls: 'high' })
  })

  it('returns mid for confidence 0.40-0.70', () => {
    expect(getConfidenceLevel(0.55)).toEqual({ level: 'moyenne', cls: 'mid' })
    expect(getConfidenceLevel(0.40)).toEqual({ level: 'moyenne', cls: 'mid' })
    expect(getConfidenceLevel(0.70)).toEqual({ level: 'moyenne', cls: 'mid' })
  })

  it('returns low for confidence < 0.40', () => {
    expect(getConfidenceLevel(0.30)).toEqual({ level: 'basse', cls: 'low' })
    expect(getConfidenceLevel(0.10)).toEqual({ level: 'basse', cls: 'low' })
  })

  it('returns low for zero confidence', () => {
    expect(getConfidenceLevel(0)).toEqual({ level: 'basse', cls: 'low' })
  })

  it('boundary: 0.70 exactly is mid, 0.71 is high', () => {
    expect(getConfidenceLevel(0.70).cls).toBe('mid')
    expect(getConfidenceLevel(0.71).cls).toBe('high')
  })

  it('boundary: 0.39 is low, 0.40 is mid', () => {
    expect(getConfidenceLevel(0.39).cls).toBe('low')
    expect(getConfidenceLevel(0.40).cls).toBe('mid')
  })
})
