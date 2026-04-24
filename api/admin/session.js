import { verifyAdminRequest } from '../../src/server/auth/admin-session.js'

export default async function sessionHandler(req, res, env = process.env, clock = {}) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const session = verifyAdminRequest(req, env, clock)

  return res.status(200).json({ authenticated: session.valid })
}
