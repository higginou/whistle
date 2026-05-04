import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

describe('legacy production pipeline retirement', () => {
  it('has no GitHub Actions workflow for production generation or deployment', () => {
    expect(existsSync(resolve(ROOT, '.github', 'workflows', 'pipeline.yml'))).toBe(false)
    expect(existsSync(resolve(ROOT, '.github', 'workflows', 'deploy.yml'))).toBe(false)
  })

  it('has no public scraped fixture fetched by the runtime', () => {
    expect(existsSync(resolve(ROOT, 'public', 'data', 'scraped.json'))).toBe(false)
  })

  it('has no static public season payloads competing with the Vercel API', () => {
    expect(existsSync(resolve(ROOT, 'public', 'data', '2025-2026.json'))).toBe(false)
    expect(existsSync(resolve(ROOT, 'public', 'data', 'seasons.json'))).toBe(false)
  })

  it('keeps legacy scripts available only as local maintenance archives', () => {
    const scripts = ['scrape.js', 'scrape-rugbyrama.js', 'scrape-lnr.js', 'validate.js', 'elo.js', 'generate.js']

    for (const script of scripts) {
      expect(existsSync(resolve(ROOT, 'scripts', script))).toBe(true)
    }
  })
})
