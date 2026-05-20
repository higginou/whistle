import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as store from '../store.js'
import { loadSeason } from '../data.js'

// Mock store.set to track calls without side effects
vi.spyOn(store, 'set')

// Mock localStorage
const localStorageMock = (() => {
  let storage = {}
  return {
    getItem: vi.fn((key) => storage[key] ?? null),
    setItem: vi.fn((key, value) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete storage[key]
    }),
    _clear() {
      storage = {}
    },
    _set(key, value) {
      storage[key] = value
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const SEASON_DATA = {
  id: '2025-2026',
  lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  teams: [{ id: 'la-rochelle' }],
}

beforeEach(() => {
  store.reset()
  store.set.mockClear()
  mockFetch.mockReset()
  localStorageMock._clear()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
})

describe('data.loadSeason', () => {
  it('uses the Vercel public API for the current season when no id is given', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SEASON_DATA),
    })

    await loadSeason()

    expect(mockFetch).toHaveBeenCalledWith('/api/public/season?season=2025-2026', { cache: 'no-store' })
  })

  it('stores data and dispatches season event on fetch success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SEASON_DATA),
    })

    await loadSeason('2025-2026')

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'whistle-season-2025-2026',
      JSON.stringify(SEASON_DATA),
    )
    expect(store.set).toHaveBeenCalledWith('season', SEASON_DATA)
  })

  it('falls back to cache when fetch fails', async () => {
    // Pre-populate cache
    localStorageMock._set(
      'whistle-season-2025-2026',
      JSON.stringify(SEASON_DATA),
    )

    mockFetch.mockRejectedValueOnce(new Error('network error'))

    await loadSeason('2025-2026')

    expect(store.set).toHaveBeenCalledWith('season', SEASON_DATA)
  })

  it('sets dataFresh when lastUpdated differs from cache', async () => {
    const cachedData = { ...SEASON_DATA, lastUpdated: '2026-03-28T10:00:00Z' }
    localStorageMock._set(
      'whistle-season-2025-2026',
      JSON.stringify(cachedData),
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SEASON_DATA),
    })

    await loadSeason('2025-2026')

    expect(store.set).toHaveBeenCalledWith('dataFresh', true)
    expect(store.set).toHaveBeenCalledWith('season', SEASON_DATA)
  })

  it('does NOT set dataFresh when lastUpdated is same as cache', async () => {
    localStorageMock._set(
      'whistle-season-2025-2026',
      JSON.stringify(SEASON_DATA),
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SEASON_DATA),
    })

    await loadSeason('2025-2026')

    const dataFreshCalls = store.set.mock.calls.filter(
      ([key]) => key === 'dataFresh',
    )
    expect(dataFreshCalls).toHaveLength(0)
  })

  it('sets dataFresh on first visit (no cache)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SEASON_DATA),
    })

    await loadSeason('2025-2026')

    expect(store.set).toHaveBeenCalledWith('dataFresh', true)
  })

  it('sets dataStale when lastUpdated is older than 7 days', async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    const staleData = { ...SEASON_DATA, lastUpdated: oldDate }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(staleData),
    })

    await loadSeason('2025-2026')

    expect(store.set).toHaveBeenCalledWith('dataStale', oldDate)
  })

  it('does NOT set dataStale when data is recent', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SEASON_DATA),
    })

    await loadSeason('2025-2026')

    const staleCalls = store.set.mock.calls.filter(
      ([key]) => key === 'dataStale',
    )
    expect(staleCalls).toHaveLength(0)
  })

  it('clears previous dataStale when fresh data loads', async () => {
    store.set('dataStale', '2026-03-28T10:00:00Z')
    store.set.mockClear()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SEASON_DATA),
    })

    await loadSeason('2025-2026')

    expect(store.set).toHaveBeenCalledWith('dataStale', null)
    expect(store.set).toHaveBeenCalledWith('season', SEASON_DATA)
  })

  it('sets dataStale on cache fallback with old data', async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const staleData = { ...SEASON_DATA, lastUpdated: oldDate }
    localStorageMock._set(
      'whistle-season-2025-2026',
      JSON.stringify(staleData),
    )

    mockFetch.mockRejectedValueOnce(new Error('network error'))

    await loadSeason('2025-2026')

    expect(store.set).toHaveBeenCalledWith('dataStale', oldDate)
    expect(store.set).toHaveBeenCalledWith('season', staleData)
  })

  it('sets season to null when no cache and fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    await loadSeason('2025-2026')

    expect(store.set).toHaveBeenCalledWith('season', null)
  })

  it('does not fall back to cache when the public projection is stale', async () => {
    localStorageMock._set(
      'whistle-season-2025-2026',
      JSON.stringify(SEASON_DATA),
    )

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
    })

    await loadSeason('2025-2026')

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('whistle-season-2025-2026')
    expect(store.set).toHaveBeenCalledWith('season', null)
  })

  it('stores lastVisit timestamp on successful load', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SEASON_DATA),
    })

    await loadSeason('2025-2026')

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'whistle-last-visit',
      expect.any(String),
    )
  })
})

