import { describe, expect, it } from 'vitest'
import loginHandler from '../api/admin/login.js'
import sessionHandler from '../api/admin/session.js'
import {
  ADMIN_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createAdminSession,
  parseCookies,
  serializeAdminSessionCookie,
  verifyAdminPassword,
  verifyAdminRequest,
  verifyAdminSession,
} from '../src/server/auth/admin-session.js'

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
    end(body = '') {
      this.body = body
      return this
    },
  }
}

describe('admin session auth', () => {
  it('creates a signed short-lived server session', () => {
    const token = createAdminSession(ENV, { now: 1_000 })
    const result = verifyAdminSession(token, ENV, { now: 1_000 + SESSION_TTL_SECONDS - 1 })

    expect(result.valid).toBe(true)
    expect(result.payload.role).toBe('admin')
  })

  it('rejects expired and tampered sessions', () => {
    const token = createAdminSession(ENV, { now: 1_000 })

    expect(verifyAdminSession(token, ENV, { now: 1_000 + SESSION_TTL_SECONDS + 1 }).valid).toBe(false)
    expect(verifyAdminSession(`${token}x`, ENV, { now: 1_000 }).valid).toBe(false)
    expect(verifyAdminSession(`${token}.extra`, ENV, { now: 1_000 }).valid).toBe(false)
  })

  it('serializes the session as an httpOnly secure cookie', () => {
    const cookie = serializeAdminSessionCookie('token-value')

    expect(cookie).toContain(`${ADMIN_SESSION_COOKIE}=token-value`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain(`Max-Age=${SESSION_TTL_SECONDS}`)
  })

  it('compares the admin password without exposing it to public code', () => {
    expect(verifyAdminPassword('short-admin-password', ENV)).toBe(true)
    expect(verifyAdminPassword('wrong-password', ENV)).toBe(false)
    expect(verifyAdminPassword('tiny', { ADMIN_PASSWORD: 'tiny' })).toBe(false)
  })

  it('parses cookies for the server auth route', () => {
    expect(parseCookies(`${ADMIN_SESSION_COOKIE}=abc.def; theme=dark`)[ADMIN_SESSION_COOKIE]).toBe('abc.def')
  })

  it('exposes a server-side guard for future admin write routes', () => {
    const token = createAdminSession(ENV, { now: 1_000 })
    const result = verifyAdminRequest(
      { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` } },
      ENV,
      { now: 1_000 },
    )

    expect(result.valid).toBe(true)
  })
})

describe('admin auth API routes', () => {
  it('keeps login behind POST and a server-side password', async () => {
    const res = createResponse()

    await loginHandler({ method: 'GET', body: {} }, res, ENV)

    expect(res.statusCode).toBe(405)
    expect(res.headers.allow).toBe('POST')
  })

  it('sets a signed session cookie after a valid admin login', async () => {
    const res = createResponse()

    await loginHandler({ method: 'POST', body: { password: 'short-admin-password' } }, res, ENV)

    expect(res.statusCode).toBe(200)
    expect(res.headers['set-cookie']).toContain(`${ADMIN_SESSION_COOKIE}=`)
    expect(res.headers['set-cookie']).toContain('HttpOnly')
    expect(res.body.authenticated).toBe(true)
  })

  it('fails closed when login succeeds but session signing is not configured', async () => {
    const res = createResponse()

    await loginHandler(
      { method: 'POST', body: { password: 'short-admin-password' }, headers: { 'x-forwarded-for': '192.0.2.30' } },
      res,
      { ADMIN_PASSWORD: 'short-admin-password' },
    )

    expect(res.statusCode).toBe(503)
    expect(res.headers['set-cookie']).toContain('Max-Age=0')
    expect(res.body.authenticated).toBe(false)
  })

  it('rejects missing or invalid admin credentials', async () => {
    const res = createResponse()

    await loginHandler({ method: 'POST', body: { password: 'bad' } }, res, ENV)

    expect(res.statusCode).toBe(401)
    expect(res.headers['set-cookie']).toContain('Max-Age=0')
  })

  it('handles malformed JSON without leaking a server error', async () => {
    const res = createResponse()

    await loginHandler({ method: 'POST', body: '{bad-json', headers: { 'x-forwarded-for': '192.0.2.10' } }, res, ENV)

    expect(res.statusCode).toBe(400)
    expect(res.headers['set-cookie']).toContain('Max-Age=0')
  })

  it('throttles repeated failed login attempts per client key', async () => {
    let lastResponse

    for (let i = 0; i < 6; i += 1) {
      lastResponse = createResponse()
      await loginHandler(
        { method: 'POST', body: { password: 'bad' }, headers: { 'x-forwarded-for': '192.0.2.20' } },
        lastResponse,
        ENV,
      )
    }

    expect(lastResponse.statusCode).toBe(429)
  })

  it('checks the signed session from the httpOnly cookie', async () => {
    const token = createAdminSession(ENV, { now: 1_000 })
    const res = createResponse()

    await sessionHandler(
      { method: 'GET', headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` } },
      res,
      ENV,
      { now: 1_000 },
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.authenticated).toBe(true)
  })

  it('fails closed when session verification is not configured', async () => {
    const res = createResponse()

    await sessionHandler({ method: 'GET', headers: { cookie: `${ADMIN_SESSION_COOKIE}=anything` } }, res, {})

    expect(res.statusCode).toBe(200)
    expect(res.body.authenticated).toBe(false)
  })
})
