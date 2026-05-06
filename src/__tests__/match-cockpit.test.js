// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, open, close, calculateBonusFlags, getCockpitSession, buildValidationPayload } from '../components/match-cockpit.js'
import { render as renderSimulateur } from '../components/tab-simulateur.js'
import { normalizeAdminMatchPayload } from '../server/api/admin-matches.js'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.removeAttribute('open')
  })
})

const SEASON = {
  teams: [
    { id: 'la-rochelle', name: 'La Rochelle' },
    { id: 'toulouse', name: 'Toulouse' },
  ],
}

describe('match-cockpit', () => {
  beforeEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
    localStorage.clear()
    vi.unstubAllGlobals()
    render(document.body)
  })

  it('renders a dialog shell', () => {
    const dialog = document.querySelector('dialog.w-match-cockpit')
    expect(dialog).not.toBeNull()
  })

  it('opens with the current match summary', () => {
    open({ season: SEASON, match: { matchday: 18, home: 'la-rochelle', away: 'toulouse' }, currentIndex: 1, totalCount: 4, remainingCount: 4 })
    const dialog = document.querySelector('dialog.w-match-cockpit')
    expect(dialog.showModal).toHaveBeenCalled()
    expect(dialog.textContent).toContain('Cockpit de match')
    expect(dialog.textContent).toContain('Journée 18')
    expect(dialog.textContent).toContain('La Rochelle')
  })

  it('close() removes the open attribute', () => {
    open({ season: SEASON, match: { matchday: 18, home: 'la-rochelle', away: 'toulouse' }, currentIndex: 1, totalCount: 4, remainingCount: 4 })
    close()
    const dialog = document.querySelector('dialog.w-match-cockpit')
    expect(dialog.hasAttribute('open')).toBe(false)
  })

  it('calculates rugby bonuses automatically', () => {
    const bonus = calculateBonusFlags({ homeScore: 27, awayScore: 24, homeTries: 5, awayTries: 2 })
    expect(bonus.home.offensive).toBe(true)
    expect(bonus.away.defensive).toBe(true)
  })

  it('detects remaining matches from validated drafts', () => {
    localStorage.setItem('w-match-cockpit-drafts', JSON.stringify({
      '18-la-rochelle-toulouse': { homeScore: 21, awayScore: 10, homeTries: 4, awayTries: 1, validated: true },
    }))

    const season = {
      season: '2025-2026',
      calendar: [
        { matchday: 18, date: '2026-04-18', home: 'la-rochelle', away: 'toulouse' },
        { matchday: 19, date: '2026-04-25', home: 'pau', away: 'lyon' },
      ],
    }

    const session = getCockpitSession(season)
    expect(session.remainingCount).toBe(1)
    expect(session.currentMatch.matchday).toBe(19)
  })

  it('ignores future scheduled matches in the cockpit queue', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-06T12:00:00Z'))

    const season = {
      season: '2025-2026',
      calendar: [
        { matchday: 21, date: '2026-04-18', home: 'bayonne', away: 'pau' },
        { matchday: 22, date: '2026-04-25', home: 'lyon', away: 'castres' },
        { matchday: 23, date: '2026-05-09', home: 'racing-92', away: 'la-rochelle' },
        { matchday: 24, date: '2026-05-16', home: 'la-rochelle', away: 'toulouse' },
      ],
    }

    const session = getCockpitSession(season)
    expect(session.totalCount).toBe(2)
    expect(session.remainingCount).toBe(2)
    expect(session.remainingMatches.map((match) => match.matchday)).toEqual([21, 22])
  })

  it('builds a normalized payload for validation', () => {
    localStorage.setItem('w-match-cockpit-drafts', JSON.stringify({
      '18-la-rochelle-toulouse': { homeScore: 21, awayScore: 10, homeTries: 4, awayTries: 1, validated: true },
    }))

    const payload = buildValidationPayload({
      season: '2025-2026',
      calendar: [
        { matchday: 18, date: '2026-04-18', home: 'la-rochelle', away: 'toulouse' },
      ],
    })

    expect(payload.seasonId).toBe('2025-2026')
    expect(payload.entries).toHaveLength(1)
    expect(payload.entries[0].bonus.home.offensive).toBe(true)
  })

  it('persists the draft when the form changes', () => {
    open({ season: SEASON, match: { matchday: 18, home: 'la-rochelle', away: 'toulouse' }, currentIndex: 1, totalCount: 4, remainingCount: 4 })
    const input = document.querySelector('input[name="homeScore"]')
    input.value = '28'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    const drafts = JSON.parse(localStorage.getItem('w-match-cockpit-drafts'))
    expect(drafts['18-la-rochelle-toulouse'].homeScore).toBe(28)
    expect(drafts['18-la-rochelle-toulouse'].validated).toBe(false)
  })

  it('blocks closing while matches remain', () => {
    open({ season: SEASON, match: { matchday: 18, home: 'la-rochelle', away: 'toulouse' }, currentIndex: 1, totalCount: 4, remainingCount: 4 })
    document.querySelector('.w-match-cockpit__close').click()
    expect(document.querySelector('dialog.w-match-cockpit').open).toBe(true)
  })

  it('opens from the simulator cockpit button', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    renderSimulateur(container, {
      teams: [
        { id: 'la-rochelle', name: 'La Rochelle' },
        { id: 'toulouse', name: 'Toulouse' },
      ],
      calendar: [{ matchday: 21, date: '2026-04-18', home: 'la-rochelle', away: 'toulouse', difficulty: 0.5 }],
    })

    container.querySelector('.w-sim-cockpit-btn').click()
    expect(document.querySelector('dialog.w-match-cockpit').open).toBe(true)
  })

  it('announces the final validation state', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    vi.stubGlobal('fetch', fetchMock)
    const season = {
      season: '2025-2026',
      calendar: [{ matchday: 18, date: '2026-04-18', home: 'la-rochelle', away: 'toulouse' }],
    }

    open({ season, match: season.calendar[0], currentIndex: 1, totalCount: 1, remainingCount: 1 })

    const inputs = document.querySelectorAll('input')
    inputs[0].value = '28'
    inputs[1].value = '14'
    inputs[2].value = '4'
    inputs[3].value = '1'
    document.querySelector('.w-match-cockpit__panel').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-cockpit-status]').textContent).toContain('Validation finale prête')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/matches', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/recompute', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/public/season?season=2025-2026', { cache: 'no-store' })
    expect(document.querySelector('dialog.w-match-cockpit').open).toBe(false)
    const matchBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(() => normalizeAdminMatchPayload(matchBody)).not.toThrow()
    expect(matchBody.date).toBe('2026-04-18T00:00:00Z')
    expect(matchBody.homeTries).toBe(4)
    expect(matchBody.awayTries).toBe(1)
    expect(matchBody.homeBonus.offensive).toBe(true)
    expect(matchBody.awayBonus.defensive).toBe(false)
  })

  it('normalizes public API calendar timestamps before backend validation', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    vi.stubGlobal('fetch', fetchMock)
    const season = {
      season: '2025-2026',
      calendar: [{ matchday: 18, date: '2026-04-18T00:00:00.000Z', home: 'la-rochelle', away: 'toulouse' }],
    }

    open({ season, match: season.calendar[0], currentIndex: 1, totalCount: 1, remainingCount: 1 })

    const inputs = document.querySelectorAll('input')
    inputs[0].value = '28'
    inputs[1].value = '14'
    inputs[2].value = '4'
    inputs[3].value = '1'
    document.querySelector('.w-match-cockpit__panel').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    const matchBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(matchBody.date).toBe('2026-04-18T00:00:00Z')
    expect(() => normalizeAdminMatchPayload(matchBody)).not.toThrow()
  })

  it('guards final validation against duplicate submits', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    vi.stubGlobal('fetch', fetchMock)
    const season = {
      season: '2025-2026',
      calendar: [{ matchday: 18, date: '2026-04-18', home: 'la-rochelle', away: 'toulouse' }],
    }

    open({ season, match: season.calendar[0], currentIndex: 1, totalCount: 1, remainingCount: 1 })

    const inputs = document.querySelectorAll('input')
    inputs[0].value = '28'
    inputs[1].value = '14'
    inputs[2].value = '4'
    inputs[3].value = '1'
    const form = document.querySelector('.w-match-cockpit__panel')
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/matches')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/recompute')
    expect(fetchMock.mock.calls[2][0]).toBe('/api/public/season?season=2025-2026')
  })

  it('keeps final validation retryable when the admin session expired', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({ saved: false }) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)
    const season = {
      season: '2025-2026',
      calendar: [{ matchday: 18, date: '2026-04-18', home: 'la-rochelle', away: 'toulouse' }],
    }

    open({ season, match: season.calendar[0], currentIndex: 1, totalCount: 1, remainingCount: 1 })

    const inputs = document.querySelectorAll('input')
    inputs[0].value = '28'
    inputs[1].value = '14'
    inputs[2].value = '4'
    inputs[3].value = '1'
    document.querySelector('.w-match-cockpit__panel').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-cockpit-status]').textContent).toContain('Session admin expirée')
    expect(JSON.parse(localStorage.getItem('w-match-cockpit-final')).entries).toHaveLength(1)

    document.querySelector('[data-cockpit-final-retry]').click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/matches')
    expect(fetchMock.mock.calls[2][0]).toBe('/api/admin/recompute')
    expect(fetchMock.mock.calls[3][0]).toBe('/api/public/season?season=2025-2026')
    expect(localStorage.getItem('w-match-cockpit-final')).toBeNull()
  })
})
