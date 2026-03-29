/** @module data — Network-first data fetcher with localStorage cache */

import { set } from './store.js'

const CACHE_PREFIX = 'whistle-season-'
const LAST_VISIT_KEY = 'whistle-last-visit'
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Load season data (network-first, cache fallback).
 * @param {string} [seasonId] — if omitted, resolved from seasons.json
 */
async function loadSeason(seasonId) {
  if (!seasonId) {
    seasonId = await resolveCurrentSeason()
    if (!seasonId) {
      set('season', null)
      return
    }
  }

  const url = `./data/${seasonId}.json`
  const cacheKey = CACHE_PREFIX + seasonId

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()

    // Freshness detection: first visit or updated data
    const cached = readCache(cacheKey)
    if (!cached || cached.lastUpdated !== data.lastUpdated) {
      set('dataFresh', true)
    }

    // Staleness detection
    if (data.lastUpdated) {
      const age = Date.now() - new Date(data.lastUpdated).getTime()
      if (age > STALE_THRESHOLD_MS) {
        set('dataStale', data.lastUpdated)
      }
    }

    // Store in cache
    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString())

    set('season', data)
  } catch (_fetchError) {
    // Network failed — fallback to cache
    const cached = readCache(cacheKey)
    if (cached) {
      // Staleness detection on cached data
      if (cached.lastUpdated) {
        const age = Date.now() - new Date(cached.lastUpdated).getTime()
        if (age > STALE_THRESHOLD_MS) {
          set('dataStale', cached.lastUpdated)
        }
      }
      set('season', cached)
    } else {
      set('season', null)
    }
  }
}

/**
 * Resolve current season ID from seasons.json index.
 * @returns {Promise<string|null>}
 */
async function resolveCurrentSeason() {
  try {
    const response = await fetch('./data/seasons.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const index = await response.json()
    const current = index.seasons.find((s) => s.current === true)
    return current ? current.id : null
  } catch (_err) {
    return null
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
