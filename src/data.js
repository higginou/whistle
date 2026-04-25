/** @module data — Network-first data fetcher with localStorage cache */

import { set } from './store.js'

const CACHE_PREFIX = 'whistle-season-'
const LAST_VISIT_KEY = 'whistle-last-visit'
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Load season data from the Vercel public API (network-first, cache fallback).
 * @param {string} [seasonId] — if omitted, resolved from seasons.json
 */
async function loadSeason(seasonId = '2025-2026') {
  if (!seasonId) seasonId = '2025-2026'

  const url = `/api/public/season?season=${encodeURIComponent(seasonId)}`
  const cacheKey = CACHE_PREFIX + seasonId

  try {
    const response = await fetch(url, { cache: 'no-store' })
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

/**
 * Load scraped match results (network-first, no cache).
 * Sets store key 'scraped' to the fetched data, or null on error.
 */
async function loadScraped() {
  try {
    const response = await fetch('./data/scraped.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    set('scraped', data)
  } catch (_err) {
    set('scraped', null)
  }
}

export { loadSeason, loadScraped }
