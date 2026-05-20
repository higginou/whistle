/** @module data — Network-first Vercel API fetcher with localStorage cache */

import { get, set } from './store.js'

const CACHE_PREFIX = 'whistle-season-'
const LAST_VISIT_KEY = 'whistle-last-visit'
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

function updateStaleness(lastUpdated) {
  if (!lastUpdated) {
    if (get('dataStale') !== null) set('dataStale', null)
    return
  }

  const age = Date.now() - new Date(lastUpdated).getTime()
  if (age > STALE_THRESHOLD_MS) {
    set('dataStale', lastUpdated)
  } else if (get('dataStale') !== null) {
    set('dataStale', null)
  }
}

/**
 * Load season data from the Vercel public API (network-first, cache fallback).
 * @param {string} [seasonId] — if omitted, uses the active TOP 14 season
 */
async function loadSeason(seasonId = '2025-2026') {
  if (!seasonId) seasonId = '2025-2026'

  const url = `/api/public/season?season=${encodeURIComponent(seasonId)}`
  const cacheKey = CACHE_PREFIX + seasonId

  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (response.status === 409) throw new Error('projection-stale')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()

    // Freshness detection: first visit or updated data
    const cached = readCache(cacheKey)
    if (!cached || cached.lastUpdated !== data.lastUpdated) {
      set('dataFresh', true)
    }

    updateStaleness(data.lastUpdated)

    // Store in cache
    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString())

    set('season', data)
  } catch (_fetchError) {
    if (_fetchError.message === 'projection-stale') {
      localStorage.removeItem(cacheKey)
      set('season', null)
      return
    }

    // Network failed — fallback to cache
    const cached = readCache(cacheKey)
    if (cached) {
      updateStaleness(cached.lastUpdated)
      set('season', cached)
    } else {
      set('season', null)
    }
  }
}

/**
 * Read parsed JSON from localStorage, or null if absent/corrupt.
 * @param {string} key
 * @returns {object|null}
 */
function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (_parseError) {
    return null
  }
}

export { loadSeason }
