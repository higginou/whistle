import { getPublicSeasonPayload, getPublicSql, normalizeSeasonId } from '../../src/server/api/public-season.js'

export default async function publicSeasonHandler(req, res, env = process.env, options = {}) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  let season
  try {
    season = normalizeSeasonId(req.query?.season)
  } catch {
    return res.status(400).json({ error: 'invalid-season' })
  }

  try {
    const data = await getPublicSeasonPayload(season, getPublicSql(env, options.sql))
    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).json(data)
  } catch (error) {
    if (error.message === 'season-not-found') return res.status(404).json({ error: 'season-not-found' })
    if (error.message === 'projection-not-found') return res.status(404).json({ error: 'projection-not-found' })
    if (error.message === 'projection-stale') return res.status(409).json({ error: 'projection-stale' })
    if (error.message === 'projection-incomplete') return res.status(409).json({ error: 'projection-incomplete' })

    return res.status(503).json({ error: 'storage-unavailable' })
  }
}
