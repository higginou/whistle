# Donjon Arcade Fight Game — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Donjon tab as an arcade fight game experience where each La Rochelle match is presented as a sequential combat encounter with animations, verdicts, and an epic finale.

**Architecture:** Multi-component orchestrator pattern. `tab-donjon.js` owns a local state machine (SPLASH → COMBAT → VERDICT → LOCKED_DOOR/FINALE). It delegates rendering to 5 sub-components + 1 audio singleton. Each sub-component exports `render(container, options)` and `destroy()`.

**Tech Stack:** Vanilla JS, Motion v12 (`motion/mini`), Web Audio API, CSS `@keyframes` for particles/shake/flash. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-06-donjon-arcade-design.md`

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `src/components/donjon-data.js` | Data normalization: filter LR matches from scraped.json, normalize home/away → lr/opponent, derive result + magnitude |
| `src/components/donjon-splash.js` | Entry screen: counter + FIGHT button with animations |
| `src/components/donjon-combat.js` | Match display: sequential stat reveal animation |
| `src/components/donjon-verdict.js` | Victory/defeat screen with impact-scaled effects |
| `src/components/donjon-locked-door.js` | Locked door: next opponent + auto-transition |
| `src/components/donjon-finale.js` | Epic end screen: stats scroll + rank reveal |
| `src/components/donjon-audio.js` | Web Audio API singleton: SFX + BGM + mute |
| `src/styles/components/donjon-splash.css` | Splash screen styles |
| `src/styles/components/donjon-combat.css` | Combat screen styles |
| `src/styles/components/donjon-verdict.css` | Verdict screen styles + particle keyframes |
| `src/styles/components/donjon-locked-door.css` | Locked door styles |
| `src/styles/components/donjon-finale.css` | Finale screen styles + rank effects |
| `src/__tests__/donjon-data.test.js` | Unit tests for data normalization |
| `src/__tests__/donjon-state.test.js` | Unit tests for state machine transitions |
| `src/__tests__/donjon-verdict.test.js` | Unit tests for verdict tier logic |
| `src/__tests__/donjon-finale.test.js` | Unit tests for rank calculation + stats derivation |

### Modified files

| File | Change |
|------|--------|
| `src/components/tab-donjon.js` | Complete rewrite: becomes orchestrator with state machine |
| `src/styles/components/tab-donjon.css` | Complete rewrite: donjon palette custom properties + orchestrator layout |
| `src/app.js` | Line ~239: pass `scraped` data to donjon render, load scraped.json |
| `src/data.js` | Add `loadScraped()` export to fetch `scraped.json` |

---

## Task 0: Load scraped data in data layer

**Files:**
- Modify: `src/data.js`
- Modify: `src/app.js:239`
- Test: `src/__tests__/data.test.js`

The Donjon needs `scraped.json` results. Currently only `{season}.json` is loaded. Add a function to fetch and cache scraped data.

- [ ] **Step 1: Write the failing test for loadScraped**

Add to `src/__tests__/data.test.js`:

```js
describe('loadScraped', () => {
  it('fetches scraped.json and stores in store', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [{ matchday: 1, home: 'la-rochelle', away: 'toulouse', homeScore: 20, awayScore: 15 }],
        calendar: []
      })
    })
    const { loadScraped } = await import('../data.js')
    await loadScraped()
    // Verify store was called
    const { get } = await import('../store.js')
    expect(get('scraped')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/data.test.js --reporter=verbose`
Expected: FAIL — `loadScraped` not exported, `scraped` not a known store key.

- [ ] **Step 3: Add `scraped` key to store**

In `src/store.js`, add to `EVENT_NAMES`:
```js
scraped: 'scraped-loaded',
```

Add to `INITIAL_STATE`:
```js
scraped: null,
```

- [ ] **Step 4: Implement loadScraped in data.js**

Add to `src/data.js`:
```js
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/data.test.js --reporter=verbose`
Expected: PASS

- [ ] **Step 6: Verify scraped.json is available in public/data/**

Check that `public/data/scraped.json` exists (the pipeline mirrors JSON output to `public/data/` for Vite dev server). If missing, copy it:

```bash
cp data/scraped.json public/data/scraped.json
```

Also verify `vite.config.js` serves `public/data/` correctly (it should — Vite serves `public/` as static assets).

- [ ] **Step 7: Call loadScraped from app.js**

In `src/app.js`, add import:
```js
import { loadSeason, loadScraped } from './data.js'
```

At end of file, add alongside `loadSeason()`:
```js
loadScraped()
```

Update `renderTabContent` case `'donjon'` (line ~239) to pass scraped data:
```js
case 'donjon':
  renderDonjon(container, season, get('scraped'))
  break
```

- [ ] **Step 8: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: All pass

- [ ] **Step 9: Commit**

```bash
git add src/store.js src/data.js src/app.js src/__tests__/data.test.js public/data/scraped.json
git commit -m "feat(donjon): add loadScraped to fetch scraped.json results"
```

---

## Task 1: Data normalization module

**Files:**
- Create: `src/components/donjon-data.js`
- Create: `src/__tests__/donjon-data.test.js`

Pure functions to normalize scraped match data for Donjon consumption. No DOM, no side effects.

- [ ] **Step 1: Write failing tests for normalizeMatch**

Create `src/__tests__/donjon-data.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { normalizeMatch, normalizeMatches, deriveMagnitude } from '../components/donjon-data.js'

const TEAMS_MAP = new Map([
  ['perpignan', 'USA Perpignan'],
  ['bordeaux-begles', 'Union Bordeaux-Begles'],
  ['toulouse', 'Stade Toulousain'],
])

describe('donjon-data', () => {
  describe('deriveMagnitude', () => {
    it('returns "large" for gap >= 16', () => {
      expect(deriveMagnitude(31, 8)).toBe('large')
    })
    it('returns "medium" for gap 8-15', () => {
      expect(deriveMagnitude(25, 15)).toBe('medium')
    })
    it('returns "close" for gap <= 7', () => {
      expect(deriveMagnitude(20, 18)).toBe('close')
    })
    it('returns "close" for exact gap of 7', () => {
      expect(deriveMagnitude(20, 13)).toBe('close')
    })
    it('returns "medium" for exact gap of 8', () => {
      expect(deriveMagnitude(20, 12)).toBe('medium')
    })
    it('returns "medium" for exact gap of 15', () => {
      expect(deriveMagnitude(25, 10)).toBe('medium')
    })
    it('returns "large" for exact gap of 16', () => {
      expect(deriveMagnitude(26, 10)).toBe('large')
    })
  })

  describe('normalizeMatch', () => {
    it('normalizes a home match for LR', () => {
      const raw = {
        matchday: 4, date: '2025-09-27',
        home: 'la-rochelle', away: 'perpignan',
        homeScore: 31, awayScore: 8,
        homeTries: 4, awayTries: 1,
        homeBonus: { offensive: true, defensive: false },
        awayBonus: { offensive: false, defensive: false },
      }
      const result = normalizeMatch(raw, TEAMS_MAP)
      expect(result.isHome).toBe(true)
      expect(result.opponent).toEqual({ id: 'perpignan', name: 'USA Perpignan' })
      expect(result.score).toEqual({ lr: 31, opponent: 8 })
      expect(result.tries).toEqual({ lr: 4, opponent: 1 })
      expect(result.bonus.lr).toEqual({ offensive: true, defensive: false })
      expect(result.result).toBe('win')
      expect(result.magnitude).toBe('large')
    })

    it('normalizes an away match for LR', () => {
      const raw = {
        matchday: 1, date: '2025-09-06',
        home: 'bordeaux-begles', away: 'la-rochelle',
        homeScore: 23, awayScore: 18,
        homeTries: 2, awayTries: 2,
        homeBonus: { offensive: false, defensive: false },
        awayBonus: { offensive: false, defensive: true },
      }
      const result = normalizeMatch(raw, TEAMS_MAP)
      expect(result.isHome).toBe(false)
      expect(result.opponent).toEqual({ id: 'bordeaux-begles', name: 'Union Bordeaux-Begles' })
      expect(result.score).toEqual({ lr: 18, opponent: 23 })
      expect(result.result).toBe('loss')
      expect(result.magnitude).toBe('close')
      expect(result.bonus.lr).toEqual({ offensive: false, defensive: true })
    })

    it('normalizes a draw', () => {
      const raw = {
        matchday: 10, date: '2025-11-15',
        home: 'la-rochelle', away: 'toulouse',
        homeScore: 20, awayScore: 20,
        homeTries: 2, awayTries: 2,
        homeBonus: { offensive: false, defensive: false },
        awayBonus: { offensive: false, defensive: false },
      }
      const result = normalizeMatch(raw, TEAMS_MAP)
      expect(result.result).toBe('draw')
      expect(result.magnitude).toBe('close')
    })
  })

  describe('normalizeMatches', () => {
    it('filters LR matches and sorts by matchday', () => {
      const results = [
        { matchday: 3, home: 'toulouse', away: 'perpignan', homeScore: 30, awayScore: 10, homeTries: 4, awayTries: 1, homeBonus: { offensive: true, defensive: false }, awayBonus: { offensive: false, defensive: false } },
        { matchday: 1, home: 'bordeaux-begles', away: 'la-rochelle', homeScore: 23, awayScore: 18, homeTries: 2, awayTries: 2, homeBonus: { offensive: false, defensive: false }, awayBonus: { offensive: false, defensive: true } },
        { matchday: 4, home: 'la-rochelle', away: 'perpignan', homeScore: 31, awayScore: 8, homeTries: 4, awayTries: 1, homeBonus: { offensive: true, defensive: false }, awayBonus: { offensive: false, defensive: false } },
      ]
      const matches = normalizeMatches(results, TEAMS_MAP)
      expect(matches).toHaveLength(2)
      expect(matches[0].matchday).toBe(1)
      expect(matches[1].matchday).toBe(4)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/donjon-data.test.js --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement donjon-data.js**

Create `src/components/donjon-data.js`:

```js
/** @module donjon-data — Normalize scraped match data for Donjon consumption */

const LR_ID = 'la-rochelle'

/**
 * Derive magnitude from score gap.
 * @param {number} scoreA
 * @param {number} scoreB
 * @returns {"large"|"medium"|"close"}
 */
export function deriveMagnitude(scoreA, scoreB) {
  const gap = Math.abs(scoreA - scoreB)
  if (gap >= 16) return 'large'
  if (gap >= 8) return 'medium'
  return 'close'
}

/**
 * Normalize a single raw match into Donjon format.
 * @param {object} raw — from scraped.json results
 * @param {Map<string,string>} teamsMap — id → display name
 * @returns {object} normalized match
 */
export function normalizeMatch(raw, teamsMap) {
  const isHome = raw.home === LR_ID
  const opponentId = isHome ? raw.away : raw.home
  const lrScore = isHome ? raw.homeScore : raw.awayScore
  const oppScore = isHome ? raw.awayScore : raw.homeScore
  const lrTries = isHome ? raw.homeTries : raw.awayTries
  const oppTries = isHome ? raw.awayTries : raw.homeTries
  const lrBonus = isHome ? raw.homeBonus : raw.awayBonus
  const oppBonus = isHome ? raw.awayBonus : raw.homeBonus

  let result = 'draw'
  if (lrScore > oppScore) result = 'win'
  else if (lrScore < oppScore) result = 'loss'

  return {
    matchday: raw.matchday,
    date: raw.date,
    isHome,
    opponent: { id: opponentId, name: teamsMap.get(opponentId) || opponentId },
    score: { lr: lrScore, opponent: oppScore },
    tries: { lr: lrTries, opponent: oppTries },
    bonus: { lr: lrBonus, opponent: oppBonus },
    conversions: null,
    penalties: null,
    cards: null,
    scorers: null,
    result,
    magnitude: deriveMagnitude(lrScore, oppScore),
  }
}

/**
 * Filter and normalize all LR matches from scraped results.
 * @param {object[]} results — scraped.json results array
 * @param {Map<string,string>} teamsMap — id → display name
 * @returns {object[]} sorted by matchday
 */
export function normalizeMatches(results, teamsMap) {
  return results
    .filter((r) => r.home === LR_ID || r.away === LR_ID)
    .sort((a, b) => a.matchday - b.matchday)
    .map((r) => normalizeMatch(r, teamsMap))
}

/**
 * Find the next future opponent from calendar data.
 * @param {object[]} calendar — from 2025-2026.json
 * @param {number} lastPlayedMatchday
 * @param {Map<string,string>} teamsMap — id → display name
 * @returns {object|null} { matchday, date, opponent, isHome }
 */
export function findNextOpponent(calendar, lastPlayedMatchday, teamsMap) {
  const next = calendar
    .filter((c) => c.home === LR_ID || c.away === LR_ID)
    .sort((a, b) => a.matchday - b.matchday)
    .find((c) => c.matchday > lastPlayedMatchday)
  if (!next) return null
  const isHome = next.home === LR_ID
  const opponentId = isHome ? next.away : next.home
  return {
    matchday: next.matchday,
    date: next.date,
    opponent: { id: opponentId, name: teamsMap.get(opponentId) || opponentId },
    isHome,
  }
}

/**
 * Build a teams map from season data.
 * @param {object[]} teams — from season JSON
 * @returns {Map<string,string>}
 */
export function buildTeamsMap(teams) {
  return new Map(teams.map((t) => [t.id, t.name]))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/donjon-data.test.js --reporter=verbose`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/donjon-data.js src/__tests__/donjon-data.test.js
git commit -m "feat(donjon): add data normalization module with tests"
```

---

## Task 2: Verdict tier logic + finale rank calculation

**Files:**
- Create: `src/__tests__/donjon-verdict.test.js`
- Create: `src/__tests__/donjon-finale.test.js`

Pure logic tests for verdict impact tier and finale rank/stats. These functions will live in `donjon-verdict.js` and `donjon-finale.js` respectively, exported alongside render.

- [ ] **Step 1: Write failing tests for getVerdictTier**

Create `src/__tests__/donjon-verdict.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { getVerdictTier } from '../components/donjon-verdict.js'

describe('getVerdictTier', () => {
  it('returns win-large for large win', () => {
    const tier = getVerdictTier('win', 'large', { offensive: false, defensive: false })
    expect(tier).toBe('win-large')
  })

  it('returns win-large when bonus offensif regardless of magnitude', () => {
    const tier = getVerdictTier('win', 'close', { offensive: true, defensive: false })
    expect(tier).toBe('win-large')
  })

  it('returns win-small for medium win without bonus off', () => {
    const tier = getVerdictTier('win', 'medium', { offensive: false, defensive: false })
    expect(tier).toBe('win-small')
  })

  it('returns win-small for close win without bonus off', () => {
    const tier = getVerdictTier('win', 'close', { offensive: false, defensive: false })
    expect(tier).toBe('win-small')
  })

  it('returns draw', () => {
    const tier = getVerdictTier('draw', 'close', { offensive: false, defensive: false })
    expect(tier).toBe('draw')
  })

  it('returns loss-small for close loss', () => {
    const tier = getVerdictTier('loss', 'close', { offensive: false, defensive: false })
    expect(tier).toBe('loss-small')
  })

  it('returns loss-small when bonus defensif regardless of magnitude', () => {
    const tier = getVerdictTier('loss', 'large', { offensive: false, defensive: true })
    expect(tier).toBe('loss-small')
  })

  it('returns loss-large for medium loss without bonus def', () => {
    const tier = getVerdictTier('loss', 'medium', { offensive: false, defensive: false })
    expect(tier).toBe('loss-large')
  })

  it('returns loss-large for large loss without bonus def', () => {
    const tier = getVerdictTier('loss', 'large', { offensive: false, defensive: false })
    expect(tier).toBe('loss-large')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/donjon-verdict.test.js --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Write failing tests for computeFinaleStats and computeRank**

Create `src/__tests__/donjon-finale.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { computeFinaleStats, computeRank } from '../components/donjon-finale.js'

const SAMPLE_MATCHES = [
  { matchday: 1, result: 'loss', score: { lr: 18, opponent: 23 }, tries: { lr: 2, opponent: 2 }, bonus: { lr: { offensive: false, defensive: true } }, opponent: { name: 'Bordeaux' } },
  { matchday: 2, result: 'win', score: { lr: 34, opponent: 16 }, tries: { lr: 4, opponent: 2 }, bonus: { lr: { offensive: false, defensive: false } }, opponent: { name: 'Clermont' } },
  { matchday: 4, result: 'win', score: { lr: 31, opponent: 8 }, tries: { lr: 4, opponent: 1 }, bonus: { lr: { offensive: true, defensive: false } }, opponent: { name: 'Perpignan' } },
  { matchday: 5, result: 'draw', score: { lr: 20, opponent: 20 }, tries: { lr: 2, opponent: 2 }, bonus: { lr: { offensive: false, defensive: false } }, opponent: { name: 'Toulouse' } },
]

describe('computeFinaleStats', () => {
  it('computes correct wins/losses/draws', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.wins).toBe(2)
    expect(stats.losses).toBe(1)
    expect(stats.draws).toBe(1)
  })

  it('finds best win by score gap', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.bestWin.score.lr).toBe(31)
    expect(stats.bestWin.opponent.name).toBe('Perpignan')
  })

  it('finds worst loss by score gap', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.worstLoss.score.lr).toBe(18)
    expect(stats.worstLoss.opponent.name).toBe('Bordeaux')
  })

  it('counts total tries', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.totalTries).toBe(12) // 2+4+4+2
  })

  it('counts bonus offensifs', () => {
    const stats = computeFinaleStats(SAMPLE_MATCHES)
    expect(stats.bonusOffensifs).toBe(1)
  })

  it('returns null worstLoss when no losses', () => {
    const allWins = [SAMPLE_MATCHES[1], SAMPLE_MATCHES[2]]
    const stats = computeFinaleStats(allWins)
    expect(stats.worstLoss).toBeNull()
  })

  it('returns null bestWin when no wins', () => {
    const allLosses = [SAMPLE_MATCHES[0]]
    const stats = computeFinaleStats(allLosses)
    expect(stats.bestWin).toBeNull()
  })
})

describe('computeRank', () => {
  it('returns LEGENDE for >= 85% win rate', () => {
    expect(computeRank(18, 20)).toEqual({ title: 'LEGENDE', color: 'gold', tier: 5 })
  })
  it('returns GLADIATEUR for 70-84%', () => {
    expect(computeRank(15, 20)).toEqual({ title: 'GLADIATEUR', color: 'purple', tier: 4 })
  })
  it('returns CHEVALIER for 55-69%', () => {
    expect(computeRank(12, 20)).toEqual({ title: 'CHEVALIER', color: 'blue', tier: 3 })
  })
  it('returns ECUYER for 40-54%', () => {
    expect(computeRank(9, 20)).toEqual({ title: 'ECUYER', color: 'green', tier: 2 })
  })
  it('returns RECRUE for < 40%', () => {
    expect(computeRank(5, 20)).toEqual({ title: 'RECRUE', color: 'grey', tier: 1 })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/__tests__/donjon-finale.test.js --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 5: Create donjon-verdict.js with getVerdictTier**

Create `src/components/donjon-verdict.js` (logic only for now, render later):

```js
/**
 * Determine verdict display tier.
 * @param {"win"|"loss"|"draw"} result
 * @param {"large"|"medium"|"close"} magnitude
 * @param {{ offensive: boolean, defensive: boolean }} lrBonus
 * @returns {"win-large"|"win-small"|"draw"|"loss-small"|"loss-large"}
 */
export function getVerdictTier(result, magnitude, lrBonus) {
  if (result === 'draw') return 'draw'
  if (result === 'win') {
    if (magnitude === 'large' || lrBonus.offensive) return 'win-large'
    return 'win-small'
  }
  // loss
  if (magnitude === 'close' || lrBonus.defensive) return 'loss-small'
  return 'loss-large'
}
```

- [ ] **Step 6: Create donjon-finale.js with computeFinaleStats and computeRank**

Create `src/components/donjon-finale.js` (logic only for now, render later):

```js
const RANKS = [
  { threshold: 0.85, title: 'LEGENDE', color: 'gold', tier: 5 },
  { threshold: 0.70, title: 'GLADIATEUR', color: 'purple', tier: 4 },
  { threshold: 0.55, title: 'CHEVALIER', color: 'blue', tier: 3 },
  { threshold: 0.40, title: 'ECUYER', color: 'green', tier: 2 },
  { threshold: 0, title: 'RECRUE', color: 'grey', tier: 1 },
]

/**
 * Compute finale stats from normalized matches.
 * @param {object[]} matches
 * @returns {object}
 */
export function computeFinaleStats(matches) {
  const wins = matches.filter((m) => m.result === 'win')
  const losses = matches.filter((m) => m.result === 'loss')
  const draws = matches.filter((m) => m.result === 'draw')

  const bestWin = wins.length > 0
    ? wins.reduce((a, b) => (a.score.lr - a.score.opponent) >= (b.score.lr - b.score.opponent) ? a : b)
    : null

  const worstLoss = losses.length > 0
    ? losses.reduce((a, b) => (a.score.opponent - a.score.lr) >= (b.score.opponent - b.score.lr) ? a : b)
    : null

  const totalTries = matches.reduce((sum, m) => sum + m.tries.lr, 0)
  const bonusOffensifs = matches.filter((m) => m.bonus.lr.offensive).length

  return {
    total: matches.length,
    wins: wins.length,
    losses: losses.length,
    draws: draws.length,
    bestWin,
    worstLoss,
    totalTries,
    bonusOffensifs,
  }
}

/**
 * Compute rank title based on win rate.
 * @param {number} wins
 * @param {number} total
 * @returns {{ title: string, color: string, tier: number }}
 */
export function computeRank(wins, total) {
  const rate = total > 0 ? wins / total : 0
  const rank = RANKS.find((r) => rate >= r.threshold) || RANKS[RANKS.length - 1]
  return { title: rank.title, color: rank.color, tier: rank.tier }
}
```

- [ ] **Step 7: Run all donjon tests**

Run: `npx vitest run src/__tests__/donjon-verdict.test.js src/__tests__/donjon-finale.test.js --reporter=verbose`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/donjon-verdict.js src/components/donjon-finale.js src/__tests__/donjon-verdict.test.js src/__tests__/donjon-finale.test.js
git commit -m "feat(donjon): add verdict tier logic and finale rank/stats calculation"
```

---

## Task 3: Audio engine

**Files:**
- Create: `src/components/donjon-audio.js`

Web Audio API singleton. Silent failure on all errors. No tests needed for this — it's a thin hardware wrapper.

- [ ] **Step 1: Create donjon-audio.js**

Create `src/components/donjon-audio.js`:

```js
/** @module donjon-audio — Web Audio API engine for Donjon SFX + BGM */

const SOUND_CATALOG = {
  'fight-start': 'audio/donjon/fight-start.mp3',
  'score-impact': 'audio/donjon/score-impact.mp3',
  'stat-reveal': 'audio/donjon/stat-reveal.mp3',
  'win-large': 'audio/donjon/win-large.mp3',
  'win-small': 'audio/donjon/win-small.mp3',
  'draw': 'audio/donjon/draw.mp3',
  'loss-small': 'audio/donjon/loss-small.mp3',
  'loss-large': 'audio/donjon/loss-large.mp3',
  'lock': 'audio/donjon/lock.mp3',
  'finale-reveal': 'audio/donjon/finale-reveal.mp3',
  'arcade-bgm': 'audio/donjon/arcade-bgm.mp3',
}

let ctx = null
let muted = false
let bgmSource = null
let bgmBuffer = null
const bufferCache = new Map()

/**
 * Initialize AudioContext. Call on first user gesture.
 */
export async function init() {
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') await ctx.resume()
  } catch (_err) {
    ctx = null
  }
}

/**
 * Load and decode an audio file. Returns cached buffer if available.
 * @param {string} soundId
 * @returns {Promise<AudioBuffer|null>}
 */
async function loadBuffer(soundId) {
  if (bufferCache.has(soundId)) return bufferCache.get(soundId)
  const path = SOUND_CATALOG[soundId]
  if (!path || !ctx) return null
  try {
    const response = await fetch(`./${path}`)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    bufferCache.set(soundId, audioBuffer)
    return audioBuffer
  } catch (_err) {
    return null
  }
}

/**
 * Play a SFX sound.
 * @param {string} soundId
 */
export async function play(soundId) {
  if (muted || !ctx) return
  const buffer = await loadBuffer(soundId)
  if (!buffer) return
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(0)
}

/**
 * Start BGM loop.
 */
export async function startBGM() {
  if (muted || !ctx) return
  stopBGM()
  if (!bgmBuffer) bgmBuffer = await loadBuffer('arcade-bgm')
  if (!bgmBuffer) return
  bgmSource = ctx.createBufferSource()
  bgmSource.buffer = bgmBuffer
  bgmSource.loop = true
  bgmSource.connect(ctx.destination)
  bgmSource.start(0)
}

/**
 * Stop BGM.
 */
export function stopBGM() {
  if (bgmSource) {
    try { bgmSource.stop() } catch (_e) { /* already stopped */ }
    bgmSource = null
  }
}

/**
 * Set muted state.
 * @param {boolean} value
 */
export function setMuted(value) {
  muted = value
  if (muted) stopBGM()
}

/** @returns {boolean} */
export function isMuted() {
  return muted
}

/**
 * Cleanup audio context.
 */
export function destroy() {
  stopBGM()
  if (ctx) {
    try { ctx.close() } catch (_e) { /* ignore */ }
    ctx = null
  }
  bufferCache.clear()
  bgmBuffer = null
  muted = false
}
```

- [ ] **Step 2: Create audio directory placeholder**

```bash
mkdir -p public/audio/donjon
```

Create a `.gitkeep` in `public/audio/donjon/` so the directory is tracked.

- [ ] **Step 3: Commit**

```bash
git add src/components/donjon-audio.js public/audio/donjon/.gitkeep
git commit -m "feat(donjon): add Web Audio engine with SFX + BGM support"
```

---

## Task 4: CSS foundation — palette + orchestrator layout

**Files:**
- Modify: `src/styles/components/tab-donjon.css` (complete rewrite)

- [ ] **Step 1: Rewrite tab-donjon.css**

Read current `src/styles/components/tab-donjon.css`, then rewrite with donjon palette and orchestrator layout:

```css
/* Donjon palette */
.w-tab-donjon {
  --w-donjon-bg: #0a0a0f;
  --w-donjon-neon-primary: #00f0ff;
  --w-donjon-neon-secondary: #ff00aa;
  --w-donjon-gold: #ffd700;
  --w-donjon-red: #ff2244;
  --w-donjon-green: #00ff88;
  --w-donjon-text: #e0e0e0;
}

/* Orchestrator container */
.w-donjon {
  position: relative;
  min-height: 80vh;
  background: var(--w-donjon-bg);
  color: var(--w-donjon-text);
  overflow: hidden;
}

/* Phase container — each sub-component renders inside this */
.w-donjon__phase {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* Mute button — persistent top-right */
.w-donjon__mute {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 10;
  background: none;
  border: 1px solid var(--w-donjon-neon-primary);
  color: var(--w-donjon-neon-primary);
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.w-donjon__mute:focus-visible {
  outline: 2px solid var(--w-donjon-neon-primary);
  outline-offset: 2px;
}

/* Shared neon text utility */
.w-donjon-neon {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  text-shadow:
    0 0 10px currentColor,
    0 0 40px currentColor;
}

/* Flash overlay */
.w-donjon__flash {
  position: fixed;
  inset: 0;
  background: white;
  z-index: 100;
  pointer-events: none;
  opacity: 0;
}

.w-donjon__flash--active {
  animation: donjon-flash 0.3s ease-out forwards;
}

@keyframes donjon-flash {
  0% { opacity: 0.9; }
  100% { opacity: 0; }
}

/* Shake effect */
.w-donjon--shake-light {
  animation: donjon-shake-light 0.3s ease-out;
}

.w-donjon--shake-heavy {
  animation: donjon-shake-heavy 0.4s ease-out;
}

@keyframes donjon-shake-light {
  0%, 100% { transform: translate(0); }
  25% { transform: translate(-2px, 1px); }
  50% { transform: translate(2px, -1px); }
  75% { transform: translate(-1px, 2px); }
}

@keyframes donjon-shake-heavy {
  0%, 100% { transform: translate(0); }
  10% { transform: translate(-4px, 2px); }
  30% { transform: translate(4px, -3px); }
  50% { transform: translate(-3px, 4px); }
  70% { transform: translate(3px, -2px); }
  90% { transform: translate(-2px, 3px); }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/components/tab-donjon.css
git commit -m "feat(donjon): add CSS palette, orchestrator layout, and shared effects"
```

---

## Task 5: Splash screen component

**Files:**
- Create: `src/components/donjon-splash.js`
- Create: `src/styles/components/donjon-splash.css`

- [ ] **Step 1: Create donjon-splash.css**

Create `src/styles/components/donjon-splash.css`:

```css
.w-donjon-splash {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  min-height: 60vh;
}

.w-donjon-splash__title {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 900;
  color: var(--w-donjon-neon-primary);
  margin: 0;
  opacity: 0;
  transform: translateY(-40px);
}

.w-donjon-splash__title--visible {
  animation: donjon-splash-title 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes donjon-splash-title {
  to { opacity: 1; transform: translateY(0); }
}

.w-donjon-splash__subtitle {
  font-size: 1rem;
  color: var(--w-donjon-text);
  margin: 0;
  opacity: 0;
}

.w-donjon-splash__subtitle--visible {
  animation: donjon-fade-in-subtle 0.4s ease-out 0.3s forwards;
}

@keyframes donjon-fade-in-subtle {
  to { opacity: 0.6; }
}

.w-donjon-splash__counter {
  font-size: clamp(1.2rem, 4vw, 1.8rem);
  font-family: monospace;
  color: var(--w-donjon-gold);
  opacity: 0;
}

.w-donjon-splash__counter--visible {
  animation: donjon-fade-in 0.4s ease-out 0.5s forwards;
}

@keyframes donjon-fade-in {
  to { opacity: 1; }
}

.w-donjon-splash__fight {
  font-size: clamp(1.5rem, 5vw, 2rem);
  font-weight: 900;
  padding: 1rem 3rem;
  border: 2px solid var(--w-donjon-neon-primary);
  background: transparent;
  color: var(--w-donjon-neon-primary);
  cursor: pointer;
  opacity: 0;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.w-donjon-splash__fight--visible {
  animation: donjon-fade-in 0.3s ease-out 0.8s forwards,
             donjon-pulse 2s ease-in-out 1.1s infinite;
}

@keyframes donjon-pulse {
  0%, 100% {
    box-shadow: 0 0 10px var(--w-donjon-neon-primary), 0 0 30px var(--w-donjon-neon-primary);
  }
  50% {
    box-shadow: 0 0 20px var(--w-donjon-neon-primary), 0 0 60px var(--w-donjon-neon-primary);
  }
}

.w-donjon-splash__fight:focus-visible {
  outline: 2px solid var(--w-donjon-gold);
  outline-offset: 4px;
}
```

- [ ] **Step 2: Create donjon-splash.js**

Create `src/components/donjon-splash.js`:

```js
import '../styles/components/donjon-splash.css'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

let root = null
let counterId = null

/**
 * Render splash screen.
 * @param {HTMLElement} container
 * @param {{ matchesPlayed: number, totalMatchdays: number, onStart: function }} options
 */
export function render(container, { matchesPlayed, totalMatchdays, onStart }) {
  root = document.createElement('div')
  root.className = 'w-donjon-splash w-donjon__phase'

  const title = document.createElement('h1')
  title.className = 'w-donjon-splash__title w-donjon-neon'
  title.textContent = 'DONJON'

  const subtitle = document.createElement('p')
  subtitle.className = 'w-donjon-splash__subtitle'
  subtitle.textContent = 'SAISON 2025\u00b726'

  const counter = document.createElement('p')
  counter.className = 'w-donjon-splash__counter'
  counter.setAttribute('aria-label', `${esc(matchesPlayed)} combats sur ${esc(totalMatchdays)} disput\u00e9s`)
  counter.textContent = `0 / ${esc(totalMatchdays)} COMBATS DISPUT\u00c9S`

  const btn = document.createElement('button')
  btn.className = 'w-donjon-splash__fight'
  btn.textContent = 'FIGHT'
  btn.setAttribute('aria-label', 'D\u00e9marrer le donjon')

  btn.addEventListener('click', onStart)

  root.append(title, subtitle, counter, btn)
  container.appendChild(root)

  // Trigger animations
  requestAnimationFrame(() => {
    title.classList.add('w-donjon-splash__title--visible')
    subtitle.classList.add('w-donjon-splash__subtitle--visible')
    counter.classList.add('w-donjon-splash__counter--visible')
    btn.classList.add('w-donjon-splash__fight--visible')
  })

  // Animate counter from 0 to matchesPlayed
  let current = 0
  const step = Math.max(1, Math.floor(matchesPlayed / 20))
  counterId = setInterval(() => {
    current = Math.min(current + step, matchesPlayed)
    counter.textContent = `${current} / ${totalMatchdays} COMBATS DISPUT\u00c9S`
    if (current >= matchesPlayed) clearInterval(counterId)
  }, 50)
}

export function destroy() {
  if (counterId) clearInterval(counterId)
  if (root) root.remove()
  root = null
}
```

- [ ] **Step 3: Verify with dev server**

Run: `npm run dev` — navigate to the Donjon tab to see the splash screen (will need orchestrator wired in Task 7).

- [ ] **Step 4: Commit**

```bash
git add src/components/donjon-splash.js src/styles/components/donjon-splash.css
git commit -m "feat(donjon): add splash screen component with counter animation"
```

---

## Task 6: Combat, verdict, locked-door, finale components (render)

**Files:**
- Create: `src/components/donjon-combat.js`
- Modify: `src/components/donjon-verdict.js` (add render/destroy)
- Create: `src/components/donjon-locked-door.js`
- Modify: `src/components/donjon-finale.js` (add render/destroy)
- Create: `src/styles/components/donjon-combat.css`
- Modify: `src/styles/components/donjon-verdict.css` (create)
- Create: `src/styles/components/donjon-locked-door.css`
- Create: `src/styles/components/donjon-finale.css`

This is the biggest task. Each sub-component gets its render() + destroy() + CSS. Build them one by one.

- [ ] **Step 6a: Create donjon-combat.css**

Create `src/styles/components/donjon-combat.css` with two-column layout, sequential reveal styles, monospace scores, slide-in animations.

Key CSS classes:
- `.w-donjon-combat` — container
- `.w-donjon-combat__teams` — flex row, space-between
- `.w-donjon-combat__team` — column for team name + stats
- `.w-donjon-combat__team--lr` — LR side (neon primary)
- `.w-donjon-combat__team--opponent` — opponent side (neon secondary)
- `.w-donjon-combat__matchday` — centered header
- `.w-donjon-combat__score` — large monospace number
- `.w-donjon-combat__stat` — tries/bonus row
- `.w-donjon-combat__badge` — OFF/DEF badge
- Each stat element starts `opacity: 0; transform: translateX(...)` and gets `--visible` class.

- [ ] **Step 6b: Create donjon-combat.js**

Create `src/components/donjon-combat.js` with:
- `render(container, { match, audio, onSequenceComplete })`
- Sequential animation: builds DOM elements, then runs async sequence adding `--visible` classes with `setTimeout` chains
- Uses `audio.play('score-impact')` for scores, `audio.play('stat-reveal')` for other stats
- After last stat, 300ms pause then calls `onSequenceComplete()`
- `destroy()` clears timeouts and removes root

- [ ] **Step 6c: Create donjon-verdict.css**

Create `src/styles/components/donjon-verdict.css` with:
- `.w-donjon-verdict` — centered container
- `.w-donjon-verdict__text` — large verdict text, scale animation
- `.w-donjon-verdict__text--win-large` — gold color
- `.w-donjon-verdict__text--win-small` — green color
- `.w-donjon-verdict__text--draw` — white
- `.w-donjon-verdict__text--loss-small` — orange
- `.w-donjon-verdict__text--loss-large` — red
- `.w-donjon-verdict__score` — small score below
- `.w-donjon-verdict__next` — SUIVANT button (reuses pulse style)
- `.w-donjon-verdict__particle` — particle animation keyframes
- `@keyframes donjon-verdict-scale` — 0 → 1.2 → 1
- `@keyframes donjon-vignette` — dark vignette for loss-large

- [ ] **Step 6d: Add render/destroy to donjon-verdict.js**

Add to existing `src/components/donjon-verdict.js`:
- `render(container, { match, audio, onNext, onShake })`
- Calls `getVerdictTier()` to determine tier
- Builds verdict text with tier-specific class
- Plays tier-specific audio
- Calls `onShake(tier)` callback — the orchestrator handles adding shake class to `.w-donjon` (verdict does NOT reach outside its own subtree)
- Spawns particles for `win-large` (15-20 `span.w-donjon-verdict__particle` with random CSS custom properties for position/delay)
- After 1.5s, shows SUIVANT button
- `destroy()` removes root

- [ ] **Step 6e: Create donjon-locked-door.css**

Create `src/styles/components/donjon-locked-door.css` with:
- `.w-donjon-locked` — centered container
- `.w-donjon-locked__padlock` — large icon, pulse glow
- `.w-donjon-locked__label` — "PROCHAIN COMBAT" in arcade style
- `.w-donjon-locked__opponent` — large name, letter-by-letter reveal
- `.w-donjon-locked__info` — date + venue
- `@keyframes donjon-letter-reveal` — opacity per character

- [ ] **Step 6f: Create donjon-locked-door.js**

Create `src/components/donjon-locked-door.js`:
- `render(container, { nextOpponent, audio, onTimeout })`
- Builds padlock icon + opponent info
- Plays `audio.play('lock')`
- Letter-by-letter reveal: wraps each character of opponent name in a `span` with staggered animation delay
- `setTimeout(onTimeout, 3000)`
- `destroy()` clears timeout, removes root

- [ ] **Step 6g: Create donjon-finale.css**

Create `src/styles/components/donjon-finale.css` with:
- `.w-donjon-finale` — dark background, centered
- `.w-donjon-finale__stat` — single stat line, fade-in with stagger
- `.w-donjon-finale__rank` — large rank text with scale animation
- `.w-donjon-finale__rank--gold` / `--purple` / `--blue` / `--green` / `--grey` — color variants
- `.w-donjon-finale__replay` — REJOUER button
- `@keyframes donjon-stat-scroll` — slide up + fade in
- `@keyframes donjon-rank-reveal` — scale 0 → 1.3 → 1
- Rank-specific effects: `@keyframes donjon-particle-rain` (gold), `@keyframes donjon-glow-pulse` (purple), `@keyframes donjon-lightning` (blue), `@keyframes donjon-flame` (green), `@keyframes donjon-smoke` (grey)

- [ ] **Step 6h: Add render/destroy to donjon-finale.js**

Add to existing `src/components/donjon-finale.js`:
- `render(container, { matches, audio, onReplay })`
- Calls `computeFinaleStats()` and `computeRank()`
- Builds stat lines with staggered fade-in (each line delayed 0.5s more)
- After all stats, 1s pause, then rank reveal with scale animation + rank effect
- Plays `audio.play('finale-reveal')`
- Shows REJOUER button (no delay)
- `destroy()` removes root

- [ ] **Step 6i: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: All pass (logic tests from Task 2 still pass, no render tests needed for these — visual testing via dev server)

- [ ] **Step 6j: Commit**

```bash
git add src/components/donjon-combat.js src/components/donjon-verdict.js src/components/donjon-locked-door.js src/components/donjon-finale.js src/styles/components/donjon-combat.css src/styles/components/donjon-verdict.css src/styles/components/donjon-locked-door.css src/styles/components/donjon-finale.css
git commit -m "feat(donjon): add combat, verdict, locked-door, and finale components"
```

---

## Task 7: Orchestrator — tab-donjon.js rewrite

**Files:**
- Modify: `src/components/tab-donjon.js` (complete rewrite)

- [ ] **Step 1: Write failing tests for state transitions**

Create `src/__tests__/donjon-state.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.resetModules() + dynamic import to get fresh module state each test
describe('donjon orchestrator', () => {
  let container
  let render

  beforeEach(async () => {
    vi.resetModules()
    container = document.createElement('div')
    document.body.appendChild(container)
    const mod = await import('../components/tab-donjon.js')
    render = mod.render
  })

  afterEach(() => {
    container.remove()
  })

  const MOCK_SEASON = {
    matchday: 20,
    teams: [
      { id: 'la-rochelle', name: 'Stade Rochelais' },
      { id: 'perpignan', name: 'USA Perpignan' },
    ],
    calendar: [
      { matchday: 21, date: '2026-04-18', home: 'la-rochelle', away: 'perpignan' },
    ],
  }

  const MOCK_SCRAPED = {
    results: [
      {
        matchday: 1, date: '2025-09-06',
        home: 'la-rochelle', away: 'perpignan',
        homeScore: 31, awayScore: 8,
        homeTries: 4, awayTries: 1,
        homeBonus: { offensive: true, defensive: false },
        awayBonus: { offensive: false, defensive: false },
      },
    ],
  }

  it('starts in splash phase', () => {
    render(container, MOCK_SEASON, MOCK_SCRAPED)
    expect(container.querySelector('.w-donjon')).toBeTruthy()
    expect(container.querySelector('.w-donjon-splash')).toBeTruthy()
  })

  it('transitions to combat on FIGHT click', async () => {
    render(container, MOCK_SEASON, MOCK_SCRAPED)
    const btn = container.querySelector('.w-donjon-splash__fight')
    expect(btn).toBeTruthy()
    btn.click()
    // Wait for flash timeout (300ms)
    await new Promise((r) => setTimeout(r, 400))
    expect(container.querySelector('.w-donjon-combat')).toBeTruthy()
  })

  it('renders with empty scraped data without crashing', () => {
    render(container, MOCK_SEASON, { results: [] })
    expect(container.querySelector('.w-donjon-splash')).toBeTruthy()
    // Counter should show 0
    const counter = container.querySelector('.w-donjon-splash__counter')
    expect(counter.textContent).toContain('0')
  })

  it('renders with null scraped data without crashing', () => {
    render(container, MOCK_SEASON, null)
    expect(container.querySelector('.w-donjon-splash')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/donjon-state.test.js --reporter=verbose`
Expected: FAIL — current tab-donjon.js doesn't produce `.w-donjon` class

- [ ] **Step 3: Rewrite tab-donjon.js as orchestrator**

Rewrite `src/components/tab-donjon.js`:

```js
import '../styles/components/tab-donjon.css'
import { normalizeMatches, findNextOpponent, buildTeamsMap } from './donjon-data.js'
import { render as renderSplash, destroy as destroySplash } from './donjon-splash.js'
import { render as renderCombat, destroy as destroyCombat } from './donjon-combat.js'
import { render as renderVerdict, destroy as destroyVerdict } from './donjon-verdict.js'
import { render as renderLockedDoor, destroy as destroyLockedDoor } from './donjon-locked-door.js'
import { render as renderFinale, destroy as destroyFinale } from './donjon-finale.js'
import * as audio from './donjon-audio.js'

const TOTAL_MATCHDAYS = 26

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

let root = null
let phaseContainer = null
let muteBtn = null
let flashEl = null

const state = {
  phase: 'splash',
  currentIndex: 0,
  matches: [],
  nextOpponent: null,
}

const destroyers = {
  splash: destroySplash,
  combat: destroyCombat,
  verdict: destroyVerdict,
  locked: destroyLockedDoor,
  finale: destroyFinale,
}

function destroyCurrentPhase() {
  const fn = destroyers[state.phase]
  if (fn) fn()
}

function flash() {
  if (!flashEl) return
  flashEl.classList.remove('w-donjon__flash--active')
  void flashEl.offsetWidth // force reflow
  flashEl.classList.add('w-donjon__flash--active')
}

function updateMuteBtn() {
  if (!muteBtn) return
  const muted = audio.isMuted()
  muteBtn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'
  muteBtn.setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son')
}

function transitionTo(phase) {
  destroyCurrentPhase()
  state.phase = phase

  switch (phase) {
    case 'splash':
      state.currentIndex = 0
      renderSplash(phaseContainer, {
        matchesPlayed: state.matches.length,
        totalMatchdays: TOTAL_MATCHDAYS,
        onStart: async () => {
          await audio.init()
          audio.play('fight-start')
          audio.startBGM()
          flash()
          setTimeout(() => transitionTo('combat'), 300)
        },
      })
      break

    case 'combat':
      renderCombat(phaseContainer, {
        match: state.matches[state.currentIndex],
        audio,
        onSequenceComplete: () => transitionTo('verdict'),
      })
      break

    case 'verdict':
      renderVerdict(phaseContainer, {
        match: state.matches[state.currentIndex],
        audio,
        onShake: (tier) => {
          const cls = (tier === 'loss-large' || tier === 'win-large') ? 'w-donjon--shake-heavy' : 'w-donjon--shake-light'
          root.classList.remove('w-donjon--shake-light', 'w-donjon--shake-heavy')
          void root.offsetWidth
          root.classList.add(cls)
        },
        onNext: () => {
          state.currentIndex++
          if (state.currentIndex < state.matches.length) {
            transitionTo('combat')
          } else if (state.matches.length >= TOTAL_MATCHDAYS) {
            transitionTo('finale')
          } else if (state.nextOpponent) {
            transitionTo('locked')
          } else {
            transitionTo('finale')
          }
        },
      })
      break

    case 'locked':
      renderLockedDoor(phaseContainer, {
        nextOpponent: state.nextOpponent,
        audio,
        onTimeout: () => transitionTo('finale'),
      })
      break

    case 'finale':
      audio.stopBGM()
      renderFinale(phaseContainer, {
        matches: state.matches,
        audio,
        onReplay: () => transitionTo('splash'),
      })
      break
  }
}

/**
 * Render the Donjon tab.
 * @param {HTMLElement} container
 * @param {object} season — season JSON data
 * @param {object} scraped — scraped.json data (may be null)
 */
export function render(container, season, scraped) {
  root = document.createElement('div')
  root.className = 'w-donjon w-tab-donjon'

  phaseContainer = document.createElement('div')
  phaseContainer.className = 'w-donjon__phases'

  flashEl = document.createElement('div')
  flashEl.className = 'w-donjon__flash'

  muteBtn = document.createElement('button')
  muteBtn.className = 'w-donjon__mute'
  muteBtn.addEventListener('click', () => {
    audio.setMuted(!audio.isMuted())
    updateMuteBtn()
  })
  updateMuteBtn()

  root.append(muteBtn, phaseContainer, flashEl)
  container.appendChild(root)

  // Prepare data
  if (season && scraped && scraped.results) {
    const teamsMap = buildTeamsMap(season.teams || [])
    state.matches = normalizeMatches(scraped.results, teamsMap)
    const lastMatchday = state.matches.length > 0
      ? state.matches[state.matches.length - 1].matchday
      : 0
    state.nextOpponent = findNextOpponent(season.calendar || [], lastMatchday, teamsMap)
  } else {
    state.matches = []
    state.nextOpponent = null
  }

  state.phase = 'splash'
  state.currentIndex = 0
  transitionTo('splash')
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All pass

- [ ] **Step 5: Update app.js donjon case**

In `src/app.js`, the donjon case now passes scraped data (done in Task 0 Step 6). Verify it works:

```js
case 'donjon':
  renderDonjon(container, season, get('scraped'))
  break
```

Also need to invalidate donjon cache when scraped data arrives. Add listener in app.js:

```js
on('scraped', () => {
  if (!viewport) return
  const donjonView = tabViews.get('donjon')
  if (donjonView) {
    donjonView.remove()
    tabViews.delete('donjon')
  }
  if (get('activeTab') === 'donjon') showTab('donjon', true)
})
```

- [ ] **Step 6: Test in dev server**

Run: `npm run dev` — navigate to Donjon tab. Verify:
- Splash screen appears with counter + FIGHT button
- FIGHT button starts combat sequence
- Matches play through sequentially
- Verdict shows after each match
- Locked door shows after last match
- Finale shows with stats + rank

- [ ] **Step 7: Run all tests + biome check**

```bash
npx vitest run --reporter=verbose && npx biome check .
```

- [ ] **Step 8: Commit**

```bash
git add src/components/tab-donjon.js src/__tests__/donjon-state.test.js src/app.js
git commit -m "feat(donjon): rewrite orchestrator with state machine and full game loop"
```

---

## Task 8: Visual polish pass

**Files:**
- All CSS files created in Tasks 4-6

After the full loop works, do a visual polish pass:

- [ ] **Step 1: Test all verdict tiers visually**

Navigate through matches in dev server and verify each verdict tier displays correctly:
- Win large (gold + particles + shake)
- Win small (green + glow)
- Draw (white + neutral)
- Loss close (orange + tremble)
- Loss large (red + heavy shake + vignette)

- [ ] **Step 2: Test finale ranks**

Verify rank effects display correctly. Current LR has 9W/11L (45% win rate) → should show ECUYER rank.

- [ ] **Step 3: Test locked door**

Verify next opponent shows correctly with letter-by-letter reveal.

- [ ] **Step 4: Adjust animation timings**

Tune delays, durations, and easing based on feel. Key values to tune:
- Combat stat reveal gaps (100-200ms)
- Verdict scale bounce (0 → 1.2 → 1)
- Splash counter speed
- Locked door auto-transition (3s)

- [ ] **Step 5: Run biome check**

```bash
npx biome check .
```

- [ ] **Step 6: Commit**

```bash
git add src/styles/components/
git commit -m "style(donjon): visual polish pass — tuned timings and effects"
```

---

## Task 9: Final integration tests + cleanup

**Files:**
- All test files
- `src/app.js` (verify import cleanup)

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run --reporter=verbose
```

Expected: All pass.

- [ ] **Step 2: Run biome check**

```bash
npx biome check .
```

Expected: 0 errors.

- [ ] **Step 3: Build and check bundle size**

```bash
npm run build
```

Verify total assets stay under 200Ko gzipped (audio files excluded — they're in `public/`).

- [ ] **Step 4: Test PWA offline**

Run: `npm run preview` — load Donjon tab, then go offline. Verify:
- Cached data still loads
- Donjon still works with cached scraped.json

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(donjon): complete arcade fight game tab implementation"
```
