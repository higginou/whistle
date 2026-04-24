import { describe, expect, it } from 'vitest'
import { createPostgresClient, getPostgresUrl, requirePostgresUrl } from '../src/server/db/connection.js'

describe('Vercel Postgres connection settings', () => {
  it('uses the Vercel-injected POSTGRES_URL first', () => {
    expect(getPostgresUrl({ POSTGRES_URL: 'postgres://vercel' })).toBe('postgres://vercel')
  })

  it('falls back to DATABASE_URL for Marketplace Postgres providers', () => {
    expect(getPostgresUrl({ DATABASE_URL: 'postgres://marketplace' })).toBe('postgres://marketplace')
  })

  it('skips malformed URLs instead of masking a valid fallback', () => {
    expect(getPostgresUrl({ POSTGRES_URL: 'not-a-url', DATABASE_URL: 'postgresql://marketplace' })).toBe(
      'postgresql://marketplace',
    )
  })

  it('fails with a deployment-oriented message when no Postgres secret is configured', () => {
    expect(() => requirePostgresUrl({})).toThrow(/POSTGRES_URL or DATABASE_URL/)
  })

  it('creates a lazy Postgres.js client from the selected connection URL', async () => {
    const sql = createPostgresClient({ POSTGRES_URL: 'postgres://user:pass@localhost:5432/whistle' })

    expect(typeof sql).toBe('function')
    await sql.end()
  })
})
