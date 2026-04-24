import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_SESSION_COOKIE = 'w_admin_session'
export const SESSION_TTL_SECONDS = 15 * 60
export const MIN_ADMIN_PASSWORD_LENGTH = 12

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlJson(value) {
  return base64UrlEncode(JSON.stringify(value))
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) return false

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function requireAdminSecret(env = process.env) {
  const secret = env.ADMIN_AUTH_SECRET

  if (typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error('ADMIN_AUTH_SECRET must be configured server-side with at least 32 characters')
  }

  return secret.trim()
}

export function verifyAdminPassword(password, env = process.env) {
  const expected = env.ADMIN_PASSWORD

  if (
    typeof password !== 'string' ||
    typeof expected !== 'string' ||
    expected.length < MIN_ADMIN_PASSWORD_LENGTH
  ) {
    return false
  }

  return safeEqual(sign(password, expected), sign(expected, expected))
}

export function createAdminSession(env = process.env, { now = Math.floor(Date.now() / 1000) } = {}) {
  const secret = requireAdminSecret(env)
  const payload = base64UrlJson({ role: 'admin', exp: now + SESSION_TTL_SECONDS })
  const signature = sign(payload, secret)

  return `${payload}.${signature}`
}

export function verifyAdminSession(token, env = process.env, { now = Math.floor(Date.now() / 1000) } = {}) {
  if (typeof token !== 'string') return { valid: false, reason: 'missing' }

  const parts = token.split('.')
  if (parts.length !== 2) return { valid: false, reason: 'malformed' }

  const [payloadPart, signaturePart] = parts
  if (!payloadPart || !signaturePart) return { valid: false, reason: 'malformed' }

  const expectedSignature = sign(payloadPart, requireAdminSecret(env))
  if (!safeEqual(signaturePart, expectedSignature)) return { valid: false, reason: 'invalid-signature' }

  const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf-8'))
  if (payload.role !== 'admin' || typeof payload.exp !== 'number') return { valid: false, reason: 'invalid-payload' }
  if (payload.exp <= now) return { valid: false, reason: 'expired' }

  return { valid: true, payload }
}

export function serializeAdminSessionCookie(token) {
  return `${ADMIN_SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`
}

export function clearAdminSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
}

export function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (!rawName) return cookies

    cookies[rawName] = rawValue.join('=')
    return cookies
  }, {})
}

export function verifyAdminRequest(req, env = process.env, clock = {}) {
  const cookies = parseCookies(req.headers?.cookie ?? '')

  try {
    return verifyAdminSession(cookies[ADMIN_SESSION_COOKIE], env, clock)
  } catch {
    return { valid: false, reason: 'config-error' }
  }
}
