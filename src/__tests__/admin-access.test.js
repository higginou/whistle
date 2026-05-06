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

function pendingJsonResponse(status, body) {
  let resolveResponse
  const response = new Promise((resolve) => { resolveResponse = resolve })

  return {
    response,
    resolve() {
      resolveResponse({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
      })
    },
  }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
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
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => jsonResponse(404, { error: 'projection-not-found' })))
    render(document.querySelector('#app'))
    await flushPromises()

    expect(document.querySelector('.w-admin-access__panel')).not.toBeNull()
    expect(document.querySelector('form.w-admin-access__form')).toBeNull()
    expect(fetch).toHaveBeenLastCalledWith('/api/public/season?season=2025-2026', { cache: 'no-store' })
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

    expect(fetch).toHaveBeenCalledWith('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'correct horse battery' }),
    })
    expect(input.value).toBe('')
    expect(document.querySelector('.w-admin-access__panel')).not.toBeNull()
  })

  it('shows public JSON freshness when public season is available', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => jsonResponse(200, { lastUpdated: '2026-05-05T10:00:00Z', matchday: 22 })))
    render(document.querySelector('#app'))
    await flushPromises()

    const diagnostic = document.querySelector('.w-admin-access__diagnostic')
    expect(diagnostic.textContent).toContain('JSON public disponible')
    expect(diagnostic.textContent).toContain('2026-05-05T10:00:00Z')
    expect(diagnostic.textContent).toContain('journee 22')
  })

  it('does not report public JSON available when the public payload is malformed', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => jsonResponse(200, {})))
    render(document.querySelector('#app'))
    await flushPromises()

    expect(document.querySelector('.w-admin-access__diagnostic').textContent).toContain('Diagnostic public indisponible')
    expect(document.querySelector('.w-admin-access__diagnostic').textContent).not.toContain('undefined')
  })

  it.each([
    ['projection-not-found', 'Snapshot public absent. Lance un recalcul pour creer le premier JSON public.'],
    ['season-not-found', 'Saison absente. Verifie le seed de la base Vercel.'],
    ['storage-unavailable', 'Stockage public indisponible. Verifie Vercel Postgres.'],
  ])('maps public diagnostic error %s', async (error, message) => {
    const status = error === 'storage-unavailable' ? 503 : 404
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => jsonResponse(status, { error })))
    render(document.querySelector('#app'))
    await flushPromises()

    expect(document.querySelector('.w-admin-access__diagnostic').textContent).toContain(message)
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
      .mockImplementationOnce(() => jsonResponse(404, { error: 'projection-not-found' }))
      .mockImplementationOnce(() => jsonResponse(201, { recalculated: true, snapshotId: 'snapshot-42', matchday: 22 })))
    render(document.querySelector('#app'))
    await flushPromises()

    document.querySelector('[data-admin-action="recompute"]').click()
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('/api/admin/recompute', {
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
      .mockImplementationOnce(() => jsonResponse(404, { error: 'projection-not-found' }))
      .mockImplementationOnce(() => pendingRecompute)
      .mockImplementationOnce(() => jsonResponse(200, { lastUpdated: '2026-05-05T10:00:00Z', matchday: 22 })))
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
      .mockImplementationOnce(() => jsonResponse(404, { error: 'projection-not-found' }))
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

  it('refreshes the public diagnostic after a successful recompute', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => jsonResponse(404, { error: 'projection-not-found' }))
      .mockImplementationOnce(() => jsonResponse(201, { recalculated: true, snapshotId: 'snapshot-42', matchday: 22 }))
      .mockImplementationOnce(() => jsonResponse(200, { lastUpdated: '2026-05-05T11:00:00Z', matchday: 22 })))
    render(document.querySelector('#app'))
    await flushPromises()

    expect(document.querySelector('.w-admin-access__diagnostic').textContent).toContain('Snapshot public absent')
    document.querySelector('[data-admin-action="recompute"]').click()
    await flushPromises()

    expect(document.querySelector('.w-admin-access__diagnostic').textContent).toContain('JSON public disponible')
    expect(document.querySelector('.w-admin-access__diagnostic').textContent).toContain('2026-05-05T11:00:00Z')
  })

  it('ignores a stale initial diagnostic that resolves after recompute refresh', async () => {
    const initialDiagnostic = pendingJsonResponse(404, { error: 'projection-not-found' })
    let resolveRecompute
    const recomputeResponse = new Promise((resolve) => { resolveRecompute = resolve })
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => jsonResponse(200, { authenticated: true }))
      .mockImplementationOnce(() => initialDiagnostic.response)
      .mockImplementationOnce(() => recomputeResponse)
      .mockImplementationOnce(() => jsonResponse(200, { lastUpdated: '2026-05-05T11:00:00Z', matchday: 22 })))
    render(document.querySelector('#app'))
    await flushPromises()

    document.querySelector('[data-admin-action="recompute"]').click()
    await Promise.resolve()
    resolveRecompute({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ recalculated: true, snapshotId: 'snapshot-42', matchday: 22 }),
    })
    await flushPromises()
    expect(document.querySelector('.w-admin-access__diagnostic').textContent).toContain('JSON public disponible')

    initialDiagnostic.resolve()
    await flushPromises()
    expect(document.querySelector('.w-admin-access__diagnostic').textContent).toContain('JSON public disponible')
    expect(document.querySelector('.w-admin-access__diagnostic').textContent).not.toContain('Snapshot public absent')
  })
})
