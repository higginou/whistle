import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSpringConfig } from '../src/animation/engine.js'

describe('engine — getSpringConfig', () => {
  it('returns standard spring for delta 1', () => {
    const config = getSpringConfig(1)
    expect(config.stiffness).toBe(200)
    expect(config.damping).toBe(20)
    expect(config.glow).toBe(false)
  })

  it('returns overshoot spring for delta 2', () => {
    const config = getSpringConfig(2)
    expect(config.stiffness).toBe(200)
    expect(config.damping).toBe(12)
    expect(config.glow).toBe(false)
  })

  it('returns dramatic spring with glow for delta >= 3', () => {
    const config = getSpringConfig(3)
    expect(config.stiffness).toBe(120)
    expect(config.damping).toBe(12)
    expect(config.glow).toBe(true)
  })

  it('returns dramatic spring for delta 5', () => {
    const config = getSpringConfig(5)
    expect(config.stiffness).toBe(120)
    expect(config.damping).toBe(12)
    expect(config.glow).toBe(true)
  })
})

describe('engine — revealProjection and resetProjection exports', () => {
  it('revealProjection is an exported async function', async () => {
    const mod = await import('../src/animation/engine.js')
    expect(typeof mod.revealProjection).toBe('function')
  })

  it('resetProjection is an exported function', async () => {
    const mod = await import('../src/animation/engine.js')
    expect(typeof mod.resetProjection).toBe('function')
  })
})
