# Pill Indicator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current trend arrow (↑/↓/=) and numeric badge (+2/-1) with a single combined pill indicator positioned at the right of each rank-row.

**Architecture:** The pill is created in `rank-row.js` (shared component) with arrow-only content. In the Projection tab, `tab-projection.js` enriches the pill by appending the numeric delta. Old CSS classes for both indicators are removed and replaced by `.w-rank-row__pill` variants.

**Tech Stack:** Vanilla JS, CSS custom properties, Vitest + jsdom

**Spec:** `docs/superpowers/specs/2026-04-08-pill-indicator-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/styles/components/rank-row.css` | Remove `.w-rank-row__delta` classes, add `.w-rank-row__pill` classes |
| Modify | `src/styles/components/tab-projection.css` | Remove `.w-rank-delta` classes |
| Modify | `src/components/rank-row.js` | Replace `deltaSpan` with pill element |
| Modify | `src/components/tab-projection.js` | Rewrite `renderMovementBadges()` to enrich existing pills |
| Modify | `tests/rank-row-tap.test.js` | Update assertions for new pill DOM structure |
| Modify | `src/__tests__/tab-projection.test.js` | Update assertions for pill-based movement indicators |

---

## Task 1: Update CSS — remove old classes, add pill classes

**Files:**
- Modify: `src/styles/components/rank-row.css:103-121` (remove `.w-rank-row__delta` block)
- Modify: `src/styles/components/tab-projection.css:24-47` (remove `.w-rank-delta` block)

- [ ] **Step 1: Remove old delta classes from rank-row.css**

Replace lines 103-121 (`.w-rank-row__delta` and its modifiers) with the new pill classes:

```css
.w-rank-row__pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.w-rank-row__pill--up {
  background: rgba(22, 163, 74, 0.15);
  color: var(--w-color-success);
}

.w-rank-row__pill--down {
  background: rgba(220, 38, 38, 0.15);
  color: var(--w-color-danger);
}

.w-rank-row__pill--stable {
  background: rgba(138, 143, 152, 0.1);
  color: var(--w-color-text-secondary);
}

.w-rank-row__pill-arrow {
  font-size: 10px;
}
```

- [ ] **Step 2: Remove old rank-delta classes from tab-projection.css**

Delete lines 24-47 (`.w-rank-delta`, `.w-rank-delta--up`, `.w-rank-delta--down`). Keep `.w-projection-progress` and `.w-projection-standings` intact.

- [ ] **Step 3: Verify CSS changes**

Run: `npx biome check src/styles/`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/styles/components/rank-row.css src/styles/components/tab-projection.css
git commit -m "refactor: replace delta/badge CSS with pill indicator classes"
```

---

## Task 2: Update rank-row.js — replace deltaSpan with pill

**Files:**
- Modify: `src/components/rank-row.js:56-59,175-180`

- [ ] **Step 1: Replace getDeltaDisplay with getPillDisplay and update call site**

Replace the `getDeltaDisplay` function (lines 56-59) with:

```js
function getPillDisplay(trend) {
  if (trend === 'up') return { arrow: '\u2191', cls: 'up' }
  if (trend === 'down') return { arrow: '\u2193', cls: 'down' }
  return { arrow: '=', cls: 'stable' }
}
```

Also remove line 90 (`const delta = getDeltaDisplay(team.trend)`) — the pill data will be computed inline at the DOM creation site.

- [ ] **Step 2: Replace deltaSpan creation with pill element**

Replace the delta block (lines 175-180) with:

```js
  // Trend pill (skip if no trend data)
  if (team.trend) {
    const pill = getPillDisplay(team.trend)
    const pillEl = document.createElement('span')
    pillEl.className = `w-rank-row__pill w-rank-row__pill--${pill.cls}`
    pillEl.setAttribute('aria-label', trendLabel)

    const arrowSpan = document.createElement('span')
    arrowSpan.className = 'w-rank-row__pill-arrow'
    arrowSpan.textContent = pill.arrow
    arrowSpan.setAttribute('aria-hidden', 'true')
    pillEl.appendChild(arrowSpan)

    row.appendChild(pillEl)
  }
```

Note: the `if (team.trend)` guard implements the spec requirement "Pas de donnée trend: ne pas afficher de pill".

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/rank-row-tap.test.js`
Expected: PASS (tap tests don't assert on delta DOM)

- [ ] **Step 4: Commit**

```bash
git add src/components/rank-row.js
git commit -m "refactor: replace trend arrow with pill element in rank-row"
```

---

## Task 3: Update tab-projection.js — rewrite renderMovementBadges

**Files:**
- Modify: `src/components/tab-projection.js:16-32`

- [ ] **Step 1: Rewrite renderMovementBadges function**

Replace the entire `renderMovementBadges` function (lines 16-32) with:

```js
/**
 * Enrich existing pills on rank-rows with numeric rank delta.
 * @param {HTMLElement} container
 * @param {object[]} teams — with rankDelta computed
 */
function renderMovementBadges(container, teams) {
  const rows = container.querySelectorAll('.w-rank-row')
  for (const row of rows) {
    const teamId = row.dataset.teamId
    const team = teams.find((t) => t.id === teamId)
    if (!team) continue

    const pill = row.querySelector('.w-rank-row__pill')
    if (!pill || team.rankDelta === 0) continue

    // Append numeric delta text
    const deltaText = team.rankDelta > 0 ? `+${team.rankDelta}` : String(team.rankDelta)
    pill.appendChild(document.createTextNode(deltaText))

    // Update pill modifier if delta direction differs from trend
    const deltaCls = team.rankDelta > 0 ? 'up' : 'down'
    if (!pill.classList.contains(`w-rank-row__pill--${deltaCls}`)) {
      pill.classList.remove('w-rank-row__pill--up', 'w-rank-row__pill--down', 'w-rank-row__pill--stable')
      pill.classList.add(`w-rank-row__pill--${deltaCls}`)
    }

    // Update aria-label with rank delta info
    pill.setAttribute('aria-label',
      `${Math.abs(team.rankDelta)} place${Math.abs(team.rankDelta) > 1 ? 's' : ''} ${team.rankDelta > 0 ? 'en hausse' : 'en baisse'}`)
  }
}
```

- [ ] **Step 2: Run biome check**

Run: `npx biome check src/components/tab-projection.js`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/tab-projection.js
git commit -m "refactor: rewrite renderMovementBadges to enrich pills with numeric delta"
```

---

## Task 4: Update tests

**Files:**
- Modify: `tests/rank-row-tap.test.js` (add pill presence assertion)
- Modify: `src/__tests__/tab-projection.test.js:89-106`

- [ ] **Step 0: Add pill presence test to rank-row-tap.test.js**

Add a new test to the existing `rank-row — tap interaction` describe block:

```js
  it('renders trend pill with correct class and arrow', () => {
    render(ul, makeTeam({ trend: 'up' }))
    const pill = ul.querySelector('.w-rank-row__pill')
    expect(pill).not.toBeNull()
    expect(pill.classList.contains('w-rank-row__pill--up')).toBe(true)
    expect(pill.querySelector('.w-rank-row__pill-arrow').textContent).toBe('\u2191')
  })

  it('does not render pill when trend is missing', () => {
    render(ul, makeTeam({ trend: undefined }))
    expect(ul.querySelector('.w-rank-row__pill')).toBeNull()
  })
```

- [ ] **Step 1: Update tab-projection test mock to include pill element**

The zone-group mock (lines 4-17) creates bare `.w-rank-row` divs with only `.w-rank-row__position`. The new `renderMovementBadges` looks for `.w-rank-row__pill`. Update the mock to also create the pill:

```js
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

      // Simulate pill created by rank-row.js
      const pill = document.createElement('span')
      pill.className = `w-rank-row__pill w-rank-row__pill--${team.trend === 'up' ? 'up' : team.trend === 'down' ? 'down' : 'stable'}`
      const arrow = document.createElement('span')
      arrow.className = 'w-rank-row__pill-arrow'
      arrow.textContent = team.trend === 'up' ? '\u2191' : team.trend === 'down' ? '\u2193' : '='
      pill.appendChild(arrow)
      row.appendChild(pill)

      container.appendChild(row)
    }
  }),
}))
```

- [ ] **Step 2: Update movement badge assertions**

Replace the three movement badge tests (lines 89-106) with:

```js
  it('enriches pill with numeric delta for team moving up', () => {
    const pill = container.querySelector('[data-team-id="la-rochelle"] .w-rank-row__pill')
    expect(pill).not.toBeNull()
    expect(pill.textContent).toContain('+1')
    expect(pill.classList.contains('w-rank-row__pill--up')).toBe(true)
  })

  it('enriches pill with numeric delta for team moving down', () => {
    const pill = container.querySelector('[data-team-id="bordeaux"] .w-rank-row__pill')
    expect(pill).not.toBeNull()
    expect(pill.textContent).toContain('-1')
    expect(pill.classList.contains('w-rank-row__pill--down')).toBe(true)
  })

  it('does not add numeric delta for team with no movement', () => {
    const pill = container.querySelector('[data-team-id="toulouse"] .w-rank-row__pill')
    expect(pill).not.toBeNull()
    // Pill exists (arrow only) but no numeric delta appended
    expect(pill.textContent).toBe('=')
  })
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run src/__tests__/tab-projection.test.js tests/rank-row-tap.test.js`
Expected: all PASS

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: all PASS, no regressions

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/tab-projection.test.js
git commit -m "test: update tab-projection tests for pill indicator"
```

---

## Task 5: Final verification

- [ ] **Step 1: Biome check**

Run: `npx biome check .`
Expected: 0 errors

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 3: Visual check**

Run: `npm run dev`
Open browser, check Projection tab and other tabs. Verify:
- Projection: pills show `↑+2`, `↓-1`, `=`
- Other tabs: pills show `↑`, `↓`, `=`
- Colors: green for up, red for down, gray for stable
- Pill positioned after points, before confidence bar (detaille mode)
