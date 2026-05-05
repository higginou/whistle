import { verifyAdminRequest } from '../../src/server/auth/admin-session.js'
import { getRecomputeSql, recomputeAndPersistSeason } from '../../src/server/api/admin-recompute.js'

function parseBody(body) {
  if (!body) return {}
  if (typeof body === 'object') return body
  if (typeof body !== 'string') return {}

  return JSON.parse(body)
}

const RECOMPUTE_ERROR_MESSAGES = new Set([
  'season-has-no-matches',
  'no-played-matches',
  'missing-calendar',
  'match team ids are required',
  'matchday is required',
  'played match scores are required',
  'calendar team ids are required',
  'calendar matchday is required',
  'seasonId is required',
  'generatedAt is required',
  'numSimulations must be positive',
  'team id is required',
])

export default async function adminRecomputeHandler(req, res, env = process.env, options = {}) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const session = verifyAdminRequest(req, env, options.clock)
  if (!session.valid) return res.status(401).json({ recalculated: false })

  let payload
  try {
    payload = parseBody(req.body)
  } catch {
    return res.status(400).json({ recalculated: false, error: 'invalid-json' })
  }

  try {
    const result = await recomputeAndPersistSeason(
      {
        seasonId: payload.seasonId,
        generatedAt: options.generatedAt,
        numSimulations: options.numSimulations,
        seed: options.seed,
        expectedTeamCount: options.expectedTeamCount,
      },
      getRecomputeSql(env, options.sql),
    )

    return res.status(201).json({
      recalculated: true,
      snapshotId: result.snapshotId,
      matchday: result.payload.matchday,
    })
  } catch (error) {
    if (error.message === 'invalid-season') {
      return res.status(400).json({ recalculated: false, error: 'invalid-season' })
    }

    if (!RECOMPUTE_ERROR_MESSAGES.has(error.message)) {
      return res.status(503).json({ recalculated: false, error: 'storage-unavailable' })
    }

    return res.status(422).json({ recalculated: false, error: 'recalculation-failed' })
  }
}
