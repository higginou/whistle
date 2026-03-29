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
  lastUpdated: '2026-03-29T10:00:00Z',
  teams: [{ id: 'la-rochelle' }],
}

const SEASONS_INDEX = {
  seasons: [{ id: '2025-2026', label: 'Saison 2025-2026', current: true }],
}

beforeEach(() => {
  store.set.mockClear()
  mockFetch.mockReset()
  localStorageMock._clear()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
})

describe('data.loadSeason', () => {
  it('resolves current season from seasons.json when no id given', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(SEASONS_INDEX),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(SEASON_DATA),
      })

    await loadSeason()

    expect(mockFetch).toHaveBeenCalledWith('./data/seasons.json')
    expect(mockFetch).toHaveBeenCalledWith('./data/2025-2026.json')
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

  it('sets season to null when no cache and fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    await loadSeason('2025-2026')

    expect(store.set).toHaveBeenCalledWith('season', null)
  })

  it('sets season to null when seasons.json fetch fails and no id given', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    await loadSeason()

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
