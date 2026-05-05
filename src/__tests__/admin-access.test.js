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

  it('recomputes the season from the authenticated admin panel', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => jsonResponse(201, { recalculated: true, snapshotId: 'snapshot-42', matchday: 22 })))
    render(document.querySelector('#app'))
    await flushPromises()

    document.querySelector('[data-admin-action="recompute"]').click()
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/admin/recompute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '2025-2026' }),
    })
    expect(document.querySelector('.w-admin-access__result').textContent).toContain('snapshot-42')
    expect(document.querySelector('.w-admin-access__result').textContent).toContain('journee 22')
  })

  it('disables the recompute button while recompute is pending', async () => {
    let resolveRecompute
    const pendingRecompute = new Promise((resolve) => { resolveRecompute = resolve })
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => pendingRecompute))
    render(document.querySelector('#app'))
    await flushPromises()

    const button = document.querySelector('[data-admin-action="recompute"]')
    button.click()
    await Promise.resolve()

    expect(button.disabled).toBe(true)
    resolveRecompute({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ recalculated: true, snapshotId: 'snapshot-42', matchday: 22 }),
    })
    await flushPromises()
    expect(button.disabled).toBe(false)
  })

  it.each([
    [401, { recalculated: false }, 'Session admin expiree. Reconnecte-toi puis relance.'],
    [400, { recalculated: false, error: 'invalid-season' }, 'Donnees de saison manquantes ou invalides. Verifie l initialisation DB.'],
    [422, { recalculated: false, error: 'recalculation-failed' }, 'Recalcul impossible. Verifie les matchs importes puis relance.'],
    [503, { recalculated: false }, 'Base de donnees indisponible. Reessaye apres retablissement Vercel.'],
  ])('maps recompute error %s and allows retry', async (status, body, message) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => jsonResponse(status, body))
      .mockImplementationOnce(() => jsonResponse(201, { recalculated: true, snapshotId: 'snapshot-retry', matchday: 23 })))
    render(document.querySelector('#app'))
    await flushPromises()

    const button = document.querySelector('[data-admin-action="recompute"]')
    button.click()
    await flushPromises()

    expect(document.querySelector('[role="alert"]').textContent).toBe(message)
    expect(button.disabled).toBe(false)

    button.click()
    await flushPromises()
    expect(document.querySelector('.w-admin-access__result').textContent).toContain('snapshot-retry')
  })
})
