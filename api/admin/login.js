import {
  clearAdminSessionCookie,
  createAdminSession,
  serializeAdminSessionCookie,
  verifyAdminPassword,
} from '../../src/server/auth/admin-session.js'

const LOGIN_WINDOW_MS = 60_000
const MAX_LOGIN_ATTEMPTS = 5
const loginAttempts = new Map()

function parseBody(body) {
  if (!body) return {}
  if (typeof body === 'object') return body
  if (typeof body !== 'string') return {}

  return JSON.parse(body)
}

function getClientKey(req) {
  const forwardedFor = req.headers?.['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim() !== '') return forwardedFor.split(',')[0].trim()

  return req.socket?.remoteAddress ?? 'unknown'
}

function isRateLimited(key, now = Date.now()) {
  const attempt = loginAttempts.get(key)
  if (!attempt || now - attempt.startedAt > LOGIN_WINDOW_MS) return false

  return attempt.count >= MAX_LOGIN_ATTEMPTS
}

function recordFailedAttempt(key, now = Date.now()) {
  const attempt = loginAttempts.get(key)

  if (!attempt || now - attempt.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, startedAt: now })
    return
  }

  attempt.count += 1
}

export default async function loginHandler(req, res, env = process.env) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const clientKey = getClientKey(req)

  if (isRateLimited(clientKey)) {
    res.setHeader('Set-Cookie', clearAdminSessionCookie())
    return res.status(429).json({ authenticated: false })
  }

  let body
  try {
    body = parseBody(req.body)
  } catch {
    res.setHeader('Set-Cookie', clearAdminSessionCookie())
    return res.status(400).json({ authenticated: false })
  }

  if (!verifyAdminPassword(body.password, env)) {
    recordFailedAttempt(clientKey)
    res.setHeader('Set-Cookie', clearAdminSessionCookie())
    return res.status(401).json({ authenticated: false })
  }

  loginAttempts.delete(clientKey)
  let token
  try {
    token = createAdminSession(env)
  } catch {
    res.setHeader('Set-Cookie', clearAdminSessionCookie())
    return res.status(503).json({ authenticated: false })
  }

  res.setHeader('Set-Cookie', serializeAdminSessionCookie(token))

  return res.status(200).json({ authenticated: true })
}
