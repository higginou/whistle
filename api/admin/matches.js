import { verifyAdminRequest } from '../../src/server/auth/admin-session.js'
import { getAdminSql, normalizeAdminMatchPayload, saveAdminMatch } from '../../src/server/api/admin-matches.js'

function parseBody(body) {
  if (!body) return {}
  if (typeof body === 'object') return body
  if (typeof body !== 'string') return {}

  return JSON.parse(body)
}

export default async function adminMatchesHandler(req, res, env = process.env, options = {}) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const session = verifyAdminRequest(req, env, options.clock)
  if (!session.valid) return res.status(401).json({ saved: false })

  let match
  try {
    match = normalizeAdminMatchPayload(parseBody(req.body))
  } catch (error) {
    return res.status(400).json({ saved: false, error: error.message })
  }

  try {
    const sql = getAdminSql(env, options.sql)
    await saveAdminMatch(match, sql)
  } catch {
    return res.status(503).json({ saved: false, error: 'storage-unavailable' })
  }

  return res.status(201).json({ saved: true, match })
}
