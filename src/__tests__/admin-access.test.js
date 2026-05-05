// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../components/admin-access.js'

function jsonResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function textResponse(status) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.reject(new SyntaxError('not json')),
  })
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('admin access', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>'
    vi.restoreAllMocks()
  })

  it('shows the login form when session is not authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, { authenticated: false })))
    render(document.querySelector('#app'))
    await flushPromises()

    expect(document.querySelector('form.w-admin-access__form')).not.toBeNull()
    expect(document.querySelector('[name="password"]')).not.toBeNull()
    expect(fetch).toHaveBeenCalledWith('/api/admin/session', { cache: 'no-store' })
  })

  it('shows the admin panel when session is authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, { authenticated: true })))
    render(document.querySelector('#app'))
    await flushPromises()

    expect(document.querySelector('.w-admin-access__panel')).not.toBeNull()
    expect(document.querySelector('form.w-admin-access__form')).toBeNull()
  })

  it('posts the password and clears it after a successful login', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: false }))
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true })))
    render(document.querySelector('#app'))
    await flushPromises()

    const input = document.querySelector('[name="password"]')
    input.value = 'correct horse battery'
    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'correct horse battery' }),
    })
    expect(input.value).toBe('')
    expect(document.querySelector('.w-admin-access__panel')).not.toBeNull()
  })

  it.each([
    [401, 'Mot de passe incorrect.'],
    [429, 'Trop de tentatives. Reessaye dans une minute.'],
    [503, 'Configuration admin indisponible cote serveur.'],
  ])('maps login error %s to a safe message', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: false }))
      .mockImplementationOnce(() => jsonResponse(status, { authenticated: false })))
    render(document.querySelector('#app'))
    await flushPromises()

    const input = document.querySelector('[name="password"]')
    input.value = 'bad password value'
    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(document.querySelector('[role="alert"]').textContent).toBe(message)
    expect(document.body.textContent).not.toContain('bad password value')
  })

  it('maps known login errors even when the response body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: false }))
      .mockImplementationOnce(() => textResponse(429)))
    render(document.querySelector('#app'))
    await flushPromises()

    const input = document.querySelector('[name="password"]')
    input.value = 'bad password value'
    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(document.querySelector('[role="alert"]').textContent).toBe('Trop de tentatives. Reessaye dans une minute.')
    expect(document.body.textContent).not.toContain('bad password value')
  })
})
