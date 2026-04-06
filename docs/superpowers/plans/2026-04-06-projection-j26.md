# Projection J-26 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display projected J-26 standings (points and rank from Monte Carlo model) in the projection tab instead of current J-20 standings.

**Architecture:** The pipeline (`elo.js`) already computes projected points via Monte Carlo but discards them. We extract the median, propagate through `generate.js` into the JSON, and update the frontend to display projected points + movement badges.

**Tech Stack:** Node.js (pipeline), Vanilla JS (frontend), Vitest (tests), CSS custom properties

**Spec:** `docs/superpowers/specs/2026-04-06-projection-j26-design.md`

---

## Task 1: Add `median()` to `elo.js`

**Files:**
- Modify: `scripts/elo.js` (add function near line 75, after other utility constants)
- Test: `tests/elo.test.js`

- [ ] **Step 1: Write failing tests for `median()`**

Add at the end of `tests/elo.test.js`:

```js
describe('median', () => {
  it('returns middle value for odd-length array', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('returns rounded average of two middle values for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(3); // (2+3)/2 = 2.5 → 3
  });

  it('returns the single value for length-1 array', () => {
    expect(median([42])).toBe(42);
  });

  it('rounds to nearest integer', () => {
    expect(median([1, 4])).toBe(3); // (1+4)/2 = 2.5 → 3
  });

  it('does not mutate the input array', () => {
    const arr = [3, 1, 2];
    median(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});
```

Update the import at the top of `tests/elo.test.js` to include `median`:

```js
import {
  // ... existing imports ...
  median,
} from '../scripts/elo.js';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/elo.test.js -t "median"`
Expected: FAIL — `median` is not exported

- [ ] **Step 3: Implement `median()` in `elo.js`**

Add after the constants section (~line 75, before the "Training-Oriented Functions" comment):

```js
/**
 * Compute median of a numeric array, rounded to nearest integer.
 * @param {number[]} arr
 * @returns {number}
 */
export function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/elo.test.js -t "median"`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/elo.js tests/elo.test.js
git commit -m "feat: add median() utility to elo.js"
```

---

## Task 2: Export `projectedPoints` from `elo.js`

**Files:**
- Modify: `scripts/elo.js:994` (destructure `pointTotals`), `scripts/elo.js:~1031` (add `projectedPoints`)
- Test: `tests/elo.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/elo.test.js`:

```js
describe('simulateSeason pointTotals', () => {
  it('returns pointTotals with one entry per simulation per team', () => {
    const elos = new Map([['a', 1500], ['b', 1500]]);
    const calendar = [{ home: 'a', away: 'b' }];
    const numSim = 100;
    const { pointTotals } = simulateSeason(elos, calendar, numSim);

    expect(pointTotals.get('a')).toHaveLength(numSim);
    expect(pointTotals.get('b')).toHaveLength(numSim);
  });

  it('pointTotals median is a reasonable integer', () => {
    const elos = new Map([['a', 1600], ['b', 1400]]);
    const calendar = [{ home: 'a', away: 'b' }];
    const initial = new Map([['a', 40], ['b', 30]]);
    const { pointTotals } = simulateSeason(elos, calendar, 1000, Math.random, initial);

    const med = median(pointTotals.get('a'));
    expect(Number.isInteger(med)).toBe(true);
    expect(med).toBeGreaterThanOrEqual(40); // at least initial points
  });
});
```

Update the import to include `simulateSeason` if not already imported (it should be — check existing imports).

- [ ] **Step 2: Run tests to verify they pass** (these test existing behavior of `simulateSeason`)

Run: `npx vitest run tests/elo.test.js -t "simulateSeason pointTotals"`
Expected: PASS — `pointTotals` is already returned by `simulateSeason`

- [ ] **Step 3: Modify `elo.js` to use `pointTotals` in team output**

At line ~994, change:
```js
const { rankCounts } = simulateSeason(
```
to:
```js
const { rankCounts, pointTotals } = simulateSeason(
```

At line ~1046 (inside the team entry construction, after `trend,`), add:
```js
projectedPoints: (() => {
  const pts = pointTotals.get(teamId) ?? [];
  return pts.length > 0 ? median(pts) : realPoints.get(teamId) ?? 0;
})(),
```

- [ ] **Step 4: Run full elo test suite**

Run: `npx vitest run tests/elo.test.js`
Expected: ALL PASS (no regressions)

- [ ] **Step 5: Verify pipeline output**

Run: `node scripts/elo.js`
Then check output contains `projectedPoints`:
```bash
grep -c "projectedPoints" data/elo-output.json
```
Expected: 14 matches (one per team)

- [ ] **Step 6: Commit**

```bash
git add scripts/elo.js tests/elo.test.js
git commit -m "feat: export projectedPoints (median Monte Carlo) from elo.js"
```

---

## Task 3: Propagate `projectedPoints` in `generate.js`

**Files:**
- Modify: `scripts/generate.js:100-118` (`buildTeamEntry`)
- Test: `tests/generate.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/generate.test.js`:

```js
it('buildTeamEntry inclut projectedPoints', () => {
  const eloTeam = makeEloTeam({ projectedPoints: 78 });
  const entry = buildTeamEntry(eloTeam);

  expect(entry.projectedPoints).toBe(78);
});

it('buildTeamEntry fallback projectedPoints sur points si absent', () => {
  const eloTeam = makeEloTeam({ points: 50 });
  const entry = buildTeamEntry(eloTeam);

  expect(entry.projectedPoints).toBe(50);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generate.test.js -t "projectedPoints"`
Expected: FAIL — `projectedPoints` is undefined

- [ ] **Step 3: Add `projectedPoints` to `buildTeamEntry`**

In `scripts/generate.js`, inside `buildTeamEntry` (~line 107), after the `points` line, add:

```js
projectedPoints: eloTeam.projectedPoints ?? eloTeam.points ?? 0,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generate.test.js`
Expected: ALL PASS

- [ ] **Step 5: Run full pipeline and verify JSON**

```bash
node scripts/elo.js && node scripts/generate.js
```

Then verify:
```bash
grep -c "projectedPoints" data/2025-2026.json
```
Expected: 14 matches

- [ ] **Step 6: Commit**

```bash
git add scripts/generate.js tests/generate.test.js
git commit -m "feat: propagate projectedPoints in generate.js"
```

---

## Task 4: Update `tab-projection.js` — header and projected points

**Files:**
- Modify: `src/components/tab-projection.js`
- Test: `src/__tests__/tab-projection.test.js`

- [ ] **Step 1: Update test mock data and write failing tests**

In `src/__tests__/tab-projection.test.js`, update `MOCK_SEASON` to include `projectedPoints` and `points`:

```js
const MOCK_SEASON = {
  matchday: 18,
  teams: [
    { id: 'toulouse', name: 'Toulouse', currentRank: 1, projectedRank: 1, elo: 1600, points: 60, projectedPoints: 82, confidence: 0.85, zones: {}, form: [], trend: 'stable' },
    { id: 'la-rochelle', name: 'La Rochelle', currentRank: 3, projectedRank: 2, elo: 1575, points: 52, projectedPoints: 75, confidence: 0.70, zones: {}, form: [], trend: 'up' },
    { id: 'bordeaux', name: 'Bordeaux', currentRank: 2, projectedRank: 3, elo: 1560, points: 55, projectedPoints: 71, confidence: 0.55, zones: {}, form: [], trend: 'down' },
  ],
}
```

Update the header test:

```js
it('renders projection J-26 header with base matchday', () => {
  const indicator = container.querySelector('.w-projection-progress')
  expect(indicator.textContent).toContain('Projection')
  expect(indicator.textContent).toContain('J-26')
  expect(indicator.textContent).toContain('J-18')
})
```

Add test for projected points:

```js
it('passes projectedPoints as points to zone groups', () => {
  const teams = renderZoneGroups.mock.calls[0][1]
  expect(teams[0].points).toBe(82) // toulouse projectedPoints
  expect(teams[1].points).toBe(75) // la-rochelle projectedPoints
  expect(teams[2].points).toBe(71) // bordeaux projectedPoints
})
```

Add test for rankDelta:

```js
it('computes rankDelta on each team', () => {
  const teams = renderZoneGroups.mock.calls[0][1]
  // toulouse: currentRank 1, projectedRank 1 → delta 0
  expect(teams[0].rankDelta).toBe(0)
  // la-rochelle: currentRank 3, projectedRank 2 → delta +1
  expect(teams[1].rankDelta).toBe(1)
  // bordeaux: currentRank 2, projectedRank 3 → delta -1
  expect(teams[2].rankDelta).toBe(-1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/tab-projection.test.js`
Expected: FAIL — header still says "Journée", no `projectedPoints`, no `rankDelta`

- [ ] **Step 3: Update `tab-projection.js`**

Replace the `render` function in `src/components/tab-projection.js` with:

```js
export function render(container, season) {
  const isDetaille = get('viewMode') === 'detaille'
  const meanConfidence = season.teams.length > 0
    ? Math.round(season.teams.reduce((sum, t) => sum + t.confidence, 0) / season.teams.length * 100)
    : 0

  const progress = document.createElement('div')
  progress.className = 'w-projection-progress'

  if (isDetaille) {
    progress.setAttribute('aria-label', `Projection journée 26, basée sur journée ${esc(season.matchday)}, confiance globale ${meanConfidence} pour cent`)
    progress.innerHTML = `
      <span class="w-projection-progress__label">Projection</span>
      <span class="w-projection-progress__value">J-26</span>
      <span class="w-projection-progress__sep">·</span>
      <span class="w-projection-progress__label">Basée sur</span>
      <span class="w-projection-progress__value">J-${esc(season.matchday)}</span>
      <span class="w-projection-progress__sep">·</span>
      <span class="w-projection-progress__label">Confiance</span>
      <span class="w-projection-progress__value">${meanConfidence}%</span>
    `
  } else {
    progress.setAttribute('aria-label', `Projection journée 26, basée sur journée ${esc(season.matchday)}`)
    progress.innerHTML = `
      <span class="w-projection-progress__label">Projection</span>
      <span class="w-projection-progress__value">J-26</span>
      <span class="w-projection-progress__sep">·</span>
      <span class="w-projection-progress__label">Basée sur</span>
      <span class="w-projection-progress__value">J-${esc(season.matchday)}</span>
    `
  }

  const standingsEl = document.createElement('div')
  standingsEl.className = 'w-projection-standings'

  const sorted = [...season.teams]
    .sort((a, b) => a.projectedRank - b.projectedRank)
    .map((t) => ({
      ...t,
      currentRank: t.projectedRank,
      points: t.projectedPoints ?? t.points,
      rankDelta: t.currentRank - t.projectedRank,
    }))
  renderZoneGroups(standingsEl, sorted)

  container.appendChild(progress)
  container.appendChild(standingsEl)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/tab-projection.test.js`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tab-projection.js src/__tests__/tab-projection.test.js
git commit -m "feat: projection tab shows J-26 header and projected points"
```

---

## Task 5: Add movement badges in `tab-projection.js`

**Files:**
- Modify: `src/components/tab-projection.js` (add `renderMovementBadges`)
- Modify: `src/styles/components/tab-projection.css` (add badge styles)
- Test: `src/__tests__/tab-projection.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/__tests__/tab-projection.test.js`. These tests need `renderZoneGroups` to actually create DOM elements. Update the mock to produce rank-rows:

```js
// Replace the existing mock at the top of the file:
vi.mock('../components/zone-group.js', () => ({
  render: vi.fn((container, teams) => {
    for (const team of teams) {
      const row = document.createElement('div')
      row.className = 'w-rank-row'
      row.dataset.teamId = team.id
      const pos = document.createElement('span')
      pos.className = 'w-rank-row__position'
      pos.textContent = String(team.currentRank)
      row.appendChild(pos)
      container.appendChild(row)
    }
  }),
}))
```

Then add tests:

```js
it('renders movement badge for team moving up', () => {
  // la-rochelle: currentRank 3 → projectedRank 2, delta +1
  const badge = container.querySelector('[data-team-id="la-rochelle"] .w-rank-delta')
  expect(badge).not.toBeNull()
  expect(badge.textContent).toBe('+1')
  expect(badge.classList.contains('w-rank-delta--up')).toBe(true)
})

it('renders movement badge for team moving down', () => {
  // bordeaux: currentRank 2 → projectedRank 3, delta -1
  const badge = container.querySelector('[data-team-id="bordeaux"] .w-rank-delta')
  expect(badge).not.toBeNull()
  expect(badge.textContent).toBe('-1')
  expect(badge.classList.contains('w-rank-delta--down')).toBe(true)
})

it('does not render badge for team with no movement', () => {
  // toulouse: currentRank 1 → projectedRank 1, delta 0
  const badge = container.querySelector('[data-team-id="toulouse"] .w-rank-delta')
  expect(badge).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/tab-projection.test.js`
Expected: FAIL — no `.w-rank-delta` elements rendered

- [ ] **Step 3: Add `renderMovementBadges` to `tab-projection.js`**

Add this function before `render()`:

```js
/**
 * Inject movement badges on rank-rows showing rank delta.
 * @param {HTMLElement} container
 * @param {object[]} teams — with rankDelta computed
 */
function renderMovementBadges(container, teams) {
  const rows = container.querySelectorAll('.w-rank-row')
  for (const row of rows) {
    const teamId = row.dataset.teamId
    const team = teams.find((t) => t.id === teamId)
    if (!team || team.rankDelta === 0) continue

    const badge = document.createElement('span')
    badge.className = `w-rank-delta w-rank-delta--${team.rankDelta > 0 ? 'up' : 'down'}`
    badge.textContent = team.rankDelta > 0 ? `+${team.rankDelta}` : String(team.rankDelta)
    badge.setAttribute('aria-label',
      `${Math.abs(team.rankDelta)} place${Math.abs(team.rankDelta) > 1 ? 's' : ''} ${team.rankDelta > 0 ? 'en hausse' : 'en baisse'}`)

    const posEl = row.querySelector('.w-rank-row__position')
    if (posEl) posEl.parentNode.insertBefore(badge, posEl.nextSibling)
  }
}
```

Then call it in `render()`, after `renderZoneGroups(standingsEl, sorted)`:

```js
renderZoneGroups(standingsEl, sorted)
renderMovementBadges(standingsEl, sorted)
```

- [ ] **Step 4: Add CSS styles**

Append to `src/styles/components/tab-projection.css`:

```css
.w-rank-delta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 800;
  margin-left: 4px;
  vertical-align: middle;
}

.w-rank-delta--up {
  background: var(--w-green-soft);
  color: var(--w-green);
}

.w-rank-delta--down {
  background: var(--w-red-soft);
  color: var(--w-red);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/tab-projection.test.js`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/tab-projection.js src/__tests__/tab-projection.test.js src/styles/components/tab-projection.css
git commit -m "feat: movement badges on projection tab showing rank delta"
```

---

## Task 6: Full regression + visual verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: ALL PASS, zero regressions

- [ ] **Step 2: Run Biome lint**

```bash
npx biome check .
```

Expected: 0 errors

- [ ] **Step 3: Run pipeline end-to-end**

```bash
node scripts/elo.js && node scripts/generate.js
```

Verify `data/2025-2026.json` contains `projectedPoints` for each team:
```bash
grep "projectedPoints" data/2025-2026.json | head -3
```

- [ ] **Step 4: Visual check**

```bash
npm run dev
```

Open browser → Projection tab. Verify:
- Header says "Projection J-26 · Basée sur J-20"
- Points shown are projected (higher than current standings points)
- Movement badges appear on teams with rank changes (+N green, -N red)
- No badge on teams with stable rank

- [ ] **Step 5: Final commit if any adjustments needed**
