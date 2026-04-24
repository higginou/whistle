import { describe, expect, it } from 'vitest'
import adminMatchesHandler from '../api/admin/matches.js'
import publicSeasonHandler from '../api/public/season.js'
import { createAdminSession, ADMIN_SESSION_COOKIE } from '../src/server/auth/admin-session.js'
import { normalizeAdminMatchPayload, saveAdminMatch } from '../src/server/api/admin-matches.js'
import { getPublicSeasonPayload } from '../src/server/api/public-season.js'

const ENV = {
  ADMIN_AUTH_SECRET: 'server-only-secret-with-enough-length',
  ADMIN_PASSWORD: 'short-admin-password',
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

function createSqlRecorder() {
  const calls = []
  const sql = (strings, ...values) => {
    calls.push({ text: strings.join('$'), values })
    return Promise.resolve([{ id: 'match-id' }])
  }

  return { sql, calls }
}

function createPublicSql(rows) {
  return () => Promise.resolve(rows)
}

describe('public season API', () => {
  it('returns public ranking and projection data without auth or CORS headers', async () => {
    const res = createResponse()

    await publicSeasonHandler({ method: 'GET', query: { season: '2025-2026' } }, res, {}, {
      sql: createPublicSql([
        {
          season: '2025-2026',
          matchday: 18,
          generated_at: '2026-04-18T21:00:00Z',
          brier_score: '0.12345',
          standings: {
            teams: [{ id: 'la-rochelle', elo: 1510, projectedRank: 4 }],
            predictions: [{ matchday: 18 }],
          },
        },
      ]),
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
    expect(res.body.season).toBe('2025-2026')
    expect(res.body.teams[0]).toHaveProperty('elo')
    expect(res.body.teams[0]).toHaveProperty('projectedRank')
    expect(res.body).toHaveProperty('predictions')
  })

  it('returns controlled public API errors for missing projections and missing storage', async () => {
    const missingProjection = createResponse()
    await publicSeasonHandler({ method: 'GET', query: { season: '2025-2026' } }, missingProjection, {}, {
      sql: createPublicSql([{ season: '2025-2026', standings: null }]),
    })

    expect(missingProjection.statusCode).toBe(404)

    const missingStorage = createResponse()
    await publicSeasonHandler({ method: 'GET', query: { season: '2025-2026' } }, missingStorage, {})

    expect(missingStorage.statusCode).toBe(503)
  })

  it('keeps public reads separated from admin writes', async () => {
    const res = createResponse()

    await publicSeasonHandler({ method: 'POST', query: { season: '2025-2026' } }, res)

    expect(res.statusCode).toBe(405)
    expect(res.headers.allow).toBe('GET')
  })
})

describe('admin matches API', () => {
  it('normalizes the shared admin match payload', () => {
    expect(
      normalizeAdminMatchPayload({
        seasonId: '2025-2026',
        matchday: 18,
        date: '2026-04-18T19:00:00Z',
        homeTeamId: 'la-rochelle',
        awayTeamId: 'toulouse',
        homeScore: 24,
        awayScore: 19,
      }),
    ).toEqual({
      seasonId: '2025-2026',
      matchday: 18,
      date: '2026-04-18T19:00:00Z',
      homeTeamId: 'la-rochelle',
      awayTeamId: 'toulouse',
      homeScore: 24,
      awayScore: 19,
      status: 'played',
    })
  })

  it('rejects malformed admin payloads before storage', () => {
    expect(() =>
      normalizeAdminMatchPayload({
        seasonId: '2025-2026',
        matchday: 18,
        date: 'not-a-date',
        homeTeamId: 'la-rochelle',
        awayTeamId: 'toulouse',
        homeScore: 24,
        awayScore: 19,
      }),
    ).toThrow(/ISO-8601/)

    expect(() =>
      normalizeAdminMatchPayload({
        seasonId: '2025-2026',
        matchday: 18,
        date: '2026-04-18T19:00:00Z',
        homeTeamId: 'la-rochelle',
        awayTeamId: 'toulouse',
        homeScore: 32_768,
        awayScore: 19,
      }),
    ).toThrow(/between 0 and 200/)
  })

  it('rejects admin writes without a valid session', async () => {
    const res = createResponse()

    await adminMatchesHandler({ method: 'POST', body: {} }, res, ENV, { sql: createSqlRecorder().sql })

    expect(res.statusCode).toBe(401)
  })

  it('persists an authenticated admin match through the injected SQL client', async () => {
    const token = createAdminSession(ENV, { now: 1_000 })
    const recorder = createSqlRecorder()
    const res = createResponse()

    await adminMatchesHandler(
      {
        method: 'POST',
        headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
        body: {
          seasonId: '2025-2026',
          matchday: 18,
          date: '2026-04-18T19:00:00Z',
          homeTeamId: 'la-rochelle',
          awayTeamId: 'toulouse',
          homeScore: 24,
          awayScore: 19,
        },
      },
      res,
      ENV,
      { sql: recorder.sql, clock: { now: 1_000 } },
    )

    expect(res.statusCode).toBe(201)
    expect(res.body.saved).toBe(true)
    expect(recorder.calls[0].text).toContain('INSERT INTO matches')
    expect(recorder.calls[0].values).toContain('la-rochelle')
  })

  it('returns a controlled admin response when storage is unavailable', async () => {
    const token = createAdminSession(ENV, { now: 1_000 })
    const res = createResponse()

    await adminMatchesHandler(
      {
        method: 'POST',
        headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
        body: {
          seasonId: '2025-2026',
          matchday: 18,
          date: '2026-04-18T19:00:00Z',
          homeTeamId: 'la-rochelle',
          awayTeamId: 'toulouse',
          homeScore: 24,
          awayScore: 19,
        },
      },
      res,
      ENV,
      { clock: { now: 1_000 } },
    )

    expect(res.statusCode).toBe(503)
    expect(res.body.saved).toBe(false)
  })

  it('uses the same persistence contract outside the route handler', async () => {
    const recorder = createSqlRecorder()
    await saveAdminMatch(
      {
        seasonId: '2025-2026',
        matchday: 18,
        date: '2026-04-18T19:00:00Z',
        homeTeamId: 'la-rochelle',
        awayTeamId: 'toulouse',
        homeScore: 24,
        awayScore: 19,
        status: 'played',
      },
      recorder.sql,
    )

    expect(recorder.calls).toHaveLength(1)
  })

  it('maps the latest projection snapshot to the public payload contract', async () => {
    const payload = await getPublicSeasonPayload(
      '2025-2026',
      createPublicSql([
        {
          season: '2025-2026',
          matchday: 18,
          generated_at: '2026-04-18T21:00:00Z',
          brier_score: '0.12345',
          standings: { teams: [], predictions: [] },
        },
      ]),
    )

    expect(payload).toMatchObject({ season: '2025-2026', matchday: 18, brierScore: 0.12345 })
  })
})
