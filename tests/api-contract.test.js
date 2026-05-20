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

function createSqlRecorderWithResults(results) {
  const calls = []
  const sql = (strings, ...values) => {
    calls.push({ text: strings.join('$'), values })
    return Promise.resolve(results[calls.length - 1] ?? [])
  }

  return { sql, calls }
}

function createPublicSql(rows, matchRows = [], latestPlayedMatchday = null) {
  let calls = 0
  return () => {
    calls++
    if (calls === 1) return Promise.resolve(rows)
    if (calls === 2) {
      return Promise.resolve([{
        latest_played_matchday: latestPlayedMatchday ?? rows[0]?.matchday ?? 0,
      }])
    }

    return Promise.resolve(matchRows)
  }
}

function createPublicSqlRecorder(rows, matchRows = [], latestPlayedMatchday = null) {
  const calls = []
  const sql = (strings, ...values) => {
    calls.push({ text: strings.join('$'), values })
    if (calls.length === 1) return Promise.resolve(rows)
    if (calls.length === 2) {
      return Promise.resolve([{
        latest_played_matchday: latestPlayedMatchday ?? rows[0]?.matchday ?? 0,
      }])
    }

    return Promise.resolve(matchRows)
  }

  return { sql, calls }
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
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body.season).toBe('2025-2026')
    expect(res.body.teams[0]).toHaveProperty('elo')
    expect(res.body.teams[0]).toHaveProperty('projectedRank')
    expect(res.body).toHaveProperty('predictions')
    expect(res.body).toHaveProperty('results')
  })

  it('exposes played matches from Vercel storage in the public payload', async () => {
    const payload = await getPublicSeasonPayload(
      '2025-2026',
      createPublicSql(
        [
          {
            season: '2025-2026',
            matchday: 18,
            generated_at: '2026-04-18T21:00:00Z',
            brier_score: null,
            standings: { teams: [], predictions: [] },
          },
        ],
        [
          {
            matchday: 18,
            date: '2026-04-18T19:00:00Z',
            home_team_id: 'la-rochelle',
            away_team_id: 'toulouse',
            home_score: 24,
            away_score: 19,
            home_tries: 3,
            away_tries: 1,
            home_bonus_offensive: true,
            home_bonus_defensive: false,
            away_bonus_offensive: false,
            away_bonus_defensive: true,
          },
        ],
      ),
    )

    expect(payload.results).toEqual([
      {
        matchday: 18,
        date: '2026-04-18T19:00:00.000Z',
        home: 'la-rochelle',
        away: 'toulouse',
        homeScore: 24,
        awayScore: 19,
        homeTries: 3,
        awayTries: 1,
        homeBonus: { offensive: true, defensive: false },
        awayBonus: { offensive: false, defensive: true },
      },
    ])
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
        homeTries: 3,
        awayTries: 1,
      }),
    ).toEqual({
      seasonId: '2025-2026',
      matchday: 18,
      date: '2026-04-18T19:00:00Z',
      homeTeamId: 'la-rochelle',
      awayTeamId: 'toulouse',
      homeScore: 24,
      awayScore: 19,
      homeTries: 3,
      awayTries: 1,
      homeBonus: { offensive: false, defensive: false },
      awayBonus: { offensive: false, defensive: false },
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
        homeTries: 3,
        awayTries: 1,
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
        homeTries: 3,
        awayTries: 1,
      }),
    ).toThrow(/between 0 and 200/)

    for (const homeTries of [-1, 51]) {
      expect(() =>
        normalizeAdminMatchPayload({
          seasonId: '2025-2026',
          matchday: 18,
          date: '2026-04-18T19:00:00Z',
          homeTeamId: 'la-rochelle',
          awayTeamId: 'toulouse',
          homeScore: 24,
          awayScore: 19,
          homeTries,
          awayTries: 1,
        }),
      ).toThrow(/between 0 and 50/)
    }
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
            homeTries: 3,
            awayTries: 1,
            homeBonus: { offensive: true, defensive: false },
            awayBonus: { offensive: false, defensive: true },
          },
      },
      res,
      ENV,
      { sql: recorder.sql, clock: { now: 1_000 } },
    )

    expect(res.statusCode).toBe(201)
    expect(res.body.saved).toBe(true)
    expect(res.body.match.homeBonus.offensive).toBe(true)
    expect(res.body.match.awayBonus.defensive).toBe(true)
    expect(res.body.match.homeTries).toBe(3)
    expect(res.body.match.awayTries).toBe(1)
    expect(recorder.calls[0].text).toContain('UPDATE matches')
    expect(recorder.calls[0].text).toContain('home_tries')
    expect(recorder.calls[0].values).toContain('la-rochelle')
    expect(recorder.calls[0].values).toContain(3)
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
          homeTries: 3,
          awayTries: 1,
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
    const recorder = createSqlRecorderWithResults([[], [{ id: 'match-id' }]])
    await saveAdminMatch(
      {
        seasonId: '2025-2026',
        matchday: 18,
        date: '2026-04-18T19:00:00Z',
        homeTeamId: 'la-rochelle',
        awayTeamId: 'toulouse',
        homeScore: 24,
        awayScore: 19,
        homeTries: 3,
        awayTries: 1,
        status: 'played',
      },
      recorder.sql,
    )

    expect(recorder.calls).toHaveLength(2)
    expect(recorder.calls[0].text).toContain('UPDATE matches')
    expect(recorder.calls[1].text).toContain('INSERT INTO matches')
  })

  it('maps the latest projection snapshot to the public payload contract', async () => {
    const recorder = createPublicSqlRecorder([
        {
          season: '2025-2026',
          matchday: 18,
          generated_at: '2026-04-18T21:00:00Z',
          brier_score: '0.12345',
          standings: { teams: [], predictions: [] },
        },
      ])
    const payload = await getPublicSeasonPayload('2025-2026', recorder.sql)

    expect(payload).toMatchObject({ season: '2025-2026', matchday: 18, brierScore: 0.12345 })
    expect(recorder.calls[0].text).toContain('ORDER BY matchday DESC, generated_at DESC, id DESC')
  })

  it('refuses to serve a projection snapshot older than the latest played matchday', async () => {
    await expect(
      getPublicSeasonPayload(
        '2025-2026',
        createPublicSql(
          [
            {
              season: '2025-2026',
              matchday: 22,
              generated_at: '2026-05-04T08:31:58Z',
              brier_score: null,
              standings: { teams: [], predictions: [] },
            },
          ],
          [],
          24,
        ),
      ),
    ).rejects.toThrow(/projection-stale/)
  })

  it('returns a controlled error when the public projection is stale', async () => {
    const res = createResponse()

    await publicSeasonHandler({ method: 'GET', query: { season: '2025-2026' } }, res, {}, {
      sql: createPublicSql(
        [
          {
            season: '2025-2026',
            matchday: 22,
            generated_at: '2026-05-04T08:31:58Z',
            brier_score: null,
            standings: { teams: [], predictions: [] },
          },
        ],
        [],
        24,
      ),
    })

    expect(res.statusCode).toBe(409)
    expect(res.body).toEqual({ error: 'projection-stale' })
  })
})
