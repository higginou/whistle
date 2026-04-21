import { describe, it, expect } from 'vitest'
import { getAppBase } from '../deployment-base.js'

describe('getAppBase', () => {
  it('uses the root path on Vercel', () => {
    expect(getAppBase({ VERCEL: '1' })).toBe('/')
  })

  it('keeps the GitHub Pages base outside Vercel', () => {
    expect(getAppBase({})).toBe('/whistle/')
  })
})
