import { describe, expect, it } from 'vitest'
import adminRecomputeHandler from '../api/admin/recompute.js'
import { createAdminSession, ADMIN_SESSION_COOKIE } from '../src/server/auth/admin-session.js'
import { recomputeAndPersistSeason } from '../src/server/api/admin-recompute.js'

const ENV = {
  ADMIN_AUTH_SECRET: 'server-only-secret-with-enough-length',
  ADMIN_PASSWORD: 'short-admin-password',
}

const MATCH_ROWS = [
  {
    matchday: 25,
    date: '2025-09-06T19:00:00Z',
    home_team_id: 'la-rochelle',
    away_team_id: 'toulouse',
    home_score: 24,
    away_score: 18,
    status: 'played',
  },
  {
    matchday: 26,
    date: '2025-09-13T19:00:00Z',
    home_team_id: 'toulouse',
    away_team_id: 'la-rochelle',
    home_score: null,
    away_score: null,
    status: 'scheduled',
  },
]

const TOP14_IDS = [
  'bayonne',
  'bordeaux-begles',
  'castres',
  'clermont',
  'la-rochelle',
  'lyon',
  'montauban',
  'montpellier',
  'pau',
  'racing-92',
  'stade-francais',
  'toulon',
  'toulouse',
  'vannes',
]

function createPartialTop14Rows() {
  const played = []
  for (let i = 0; i < TOP14_IDS.length; i += 2) {
    played.push({
      matchday: 1,
      date: `2025-09-06T${String(12 + i / 2).padStart(2, '0')}:00:00Z`,
      home_team_id: TOP14_IDS[i],
      away_team_id: TOP14_IDS[i + 1],
      home_score: 24,
      away_score: 18,
      status: 'played',
    })
  }

  return [
    ...played,
    {
      matchday: 2,
      date: '2025-09-13T19:00:00Z',
      home_team_id: 'la-rochelle',
      away_team_id: 'toulouse',
      home_score: null,
      away_score: null,
      status: 'scheduled',
    },
  ]
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

function createSqlRecorder(rows = MATCH_ROWS, latestStandings = null) {
  const calls = []
  const sql = (strings, ...values) => {
    const text = strings.join('$')
    calls.push({ text, values })

    if (text.includes('FROM matches')) return Promise.resolve(rows)
    if (text.includes('FROM projection_snapshots')) {
      return Promise.resolve(latestStandings ? [{ standings: latestStandings }] : [])
    }
    if (text.includes('INSERT INTO projection_snapshots')) return Promise.resolve([{ id: 'snapshot-id' }])

    return Promise.resolve([])
  }

  return { sql, calls }
}

describe('admin recompute API', () => {
  it('requires an admin session', async () => {
    const res = createResponse()

    await adminRecomputeHandler({ method: 'POST', body: { seasonId: '2025-2026' } }, res, ENV, {
      sql: createSqlRecorder().sql,
    })

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ recalculated: false })
  })

  it('recomputes from database matches and appends a projection snapshot', async () => {
    const token = createAdminSession(ENV, { now: 1_000 })
    const recorder = createSqlRecorder()
    const res = createResponse()

    await adminRecomputeHandler(
      {
        method: 'POST',
        headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
        body: { seasonId: '2025-2026' },
      },
      res,
      ENV,
      {
        sql: recorder.sql,
        clock: { now: 1_000 },
        generatedAt: '2026-04-25T10:00:00Z',
        numSimulations: 20,
        seed: 123,
        expectedTeamCount: 2,
      },
    )

    expect(res.statusCode).toBe(201)
    expect(res.body).toMatchObject({ recalculated: true, snapshotId: 'snapshot-id', matchday: 25 })
    expect(recorder.calls.some((call) => call.text.includes('FROM matches'))).toBe(true)
    const insert = recorder.calls.find((call) => call.text.includes('INSERT INTO projection_snapshots'))
    expect(insert).toBeDefined()
    expect(insert.text).not.toMatch(/ON CONFLICT/i)
    expect(insert.values).toContain('2025-2026')
    expect(insert.values.some((value) => value?.teams?.[0]?.id)).toBe(true)
  })

  it('keeps projection history append-only across recomputes', async () => {
    const recorder = createSqlRecorder(MATCH_ROWS, {
      predictions: [{ matchday: 0, date: '2026-04-18T10:00:00Z', projections: [] }],
    })

    await recomputeAndPersistSeason(
      { seasonId: '2025-2026', generatedAt: '2026-04-25T10:00:00Z', numSimulations: 5, seed: 1, expectedTeamCount: 2 },
      recorder.sql,
    )
    await recomputeAndPersistSeason(
      { seasonId: '2025-2026', generatedAt: '2026-04-25T11:00:00Z', numSimulations: 5, seed: 1, expectedTeamCount: 2 },
      recorder.sql,
    )

    const inserts = recorder.calls.filter((call) => call.text.includes('INSERT INTO projection_snapshots'))
    expect(inserts).toHaveLength(2)
    expect(inserts[0].values.some((value) => value?.predictions?.length === 2)).toBe(true)
    expect(recorder.calls.some((call) => /UPDATE\s+projection_snapshots/i.test(call.text))).toBe(false)
  })

  it('fails cleanly before writing when a mid-season recompute has no future calendar', async () => {
    const recorder = createSqlRecorder([
      {
        matchday: 1,
        date: '2025-09-06T19:00:00Z',
        home_team_id: 'la-rochelle',
        away_team_id: 'toulouse',
        home_score: 24,
        away_score: 18,
        status: 'played',
      },
    ])

    await expect(
      recomputeAndPersistSeason(
        { seasonId: '2025-2026', generatedAt: '2026-04-25T10:00:00Z', numSimulations: 5, seed: 1 },
        recorder.sql,
      ),
    ).rejects.toThrow(/missing-calendar/)
    expect(recorder.calls.some((call) => call.text.includes('INSERT INTO projection_snapshots'))).toBe(false)
  })

  it('fails cleanly before writing when a TOP 14 future calendar is incomplete', async () => {
    const recorder = createSqlRecorder(createPartialTop14Rows())

    await expect(
      recomputeAndPersistSeason(
        { seasonId: '2025-2026', generatedAt: '2026-04-25T10:00:00Z', numSimulations: 5, seed: 1 },
        recorder.sql,
      ),
    ).rejects.toThrow(/missing-calendar/)
    expect(recorder.calls.some((call) => call.text.includes('INSERT INTO projection_snapshots'))).toBe(false)
  })

  it('returns a controlled error and writes nothing when recompute input is invalid', async () => {
    const token = createAdminSession(ENV, { now: 1_000 })
    const recorder = createSqlRecorder([
      {
        matchday: 1,
        date: '2025-09-06T19:00:00Z',
        home_team_id: 'la-rochelle',
        away_team_id: 'toulouse',
        status: 'played',
      },
    ])
    const res = createResponse()

    await adminRecomputeHandler(
      {
        method: 'POST',
        headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
        body: { seasonId: '2025-2026' },
      },
      res,
      ENV,
      { sql: recorder.sql, clock: { now: 1_000 }, generatedAt: '2026-04-25T10:00:00Z', expectedTeamCount: 2 },
    )

    expect(res.statusCode).toBe(422)
    expect(res.body).toEqual({ recalculated: false, error: 'recalculation-failed' })
    expect(recorder.calls.some((call) => call.text.includes('INSERT INTO projection_snapshots'))).toBe(false)
  })
})
