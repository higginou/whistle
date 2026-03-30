# Whistle — Bottom Navigation Bar
**Date:** 2026-03-30
**Status:** Approved

## Context

Whistle is currently a single scrollable page. The user wants to introduce a bottom navigation bar to structure the app into distinct views, with a gaming-inspired dark visual identity (contemporary 2026, not retro).

## Navigation Structure

### Bottom Nav (5 tabs)
| Tab | URL | Status | Content |
|-----|-----|--------|---------|
| Classements | `/` | Live | Score card hero + standings + Révéler button |
| Projection | `/projection` | New | Projected final standings, always visible |
| Duels | `/duels` | Placeholder (Phase 2) | Micro-classement confrontations directes (FR31) |
| Donjon | `/donjon` | New shell | 26-match dungeon crawler |
| Oracle | `/oracle` | Placeholder (Phase 2) | Model transparency — Brier Score, predictions history (FR25–FR28) |

### Header Icon
- **Succès** : trophy icon, top-right of header, visible on all tabs
- Opens a bottom sheet with achievement cards (currently on the main page, relocated here)
- Shows a badge with unlock count

## Routing Architecture

**Approach: History API (pushState)**

Two navigation layers coexist:

1. **Tab routing** — `pushState` on tab switch, `popstate` navigates back through tab history
2. **Sheet routing** — `pushState` with `{ sheet: sheetId }` on top of tab state (existing behavior preserved)

**`popstate` handler logic:**
```
if event.state.sheet exists → close sheet (existing)
else                        → browser handles back (navigates to previous tab)
```

The router inspects `event.state` — not whether a sheet is visually open — to distinguish sheet pops from tab pops. Sheet `pushState` always uses the current tab pathname with `{ sheet: sheetId }` state; tab `pushState` uses the tab pathname with `{ tab: tabId }` state. This ensures a sheet pop never consumes a tab history entry.

`event.state === null` (initial load, or states pushed without an object) is treated as a tab pop — fall through to browser back behavior, no sheet is closed.

**URL routing table:**
```
/            → Classements (default)
/projection  → Projection
/duels       → Duels
/donjon      → Donjon
/oracle      → Oracle
```

GitHub Pages compatibility: already handled by the 404.html redirect from story 4-3. During `router.js` modification, verify that the 404.html redirect shim calls `history.replaceState` with a state object (not `null`) so the null-check in `onPopState` behaves correctly on initial load.

## Tab Contents

### Classements (`/`)
- **Score card La Rochelle** (hero, ~40% screen) — existing component, unchanged
- **Standings by zone** — 14 teams, zone groups — existing component, unchanged
- **"Révéler la Projection" button** — stays here as an interactive moment
- Achievement cards **removed** from here → relocated to Succès header sheet

### Projection (`/projection`)
- **Projected final standings** — always shown, no reveal interaction needed
- Reuses existing rank-row and confidence-bar components; teams sorted by `team.projectedRank`
- Reuses existing zone-group layout
- New: **season progress indicator** — "Journée X / 26 — confiance globale: X%"
  - `X` = `season.matchday` (integer, existing JSON field — the field is `matchday`, not `currentMatchday`)
  - `confiance globale` = mean of all `team.confidence` values (0–1 decimal, displayed as %)
- Data sourced from `store.get('season')` — same pattern as all other components
- No reveal button (this view IS the revealed state)

### Duels (`/duels`) — Placeholder
- "En construction" empty state
- Will contain micro-classement des confrontations directes (Epic 5, story 5-4, FR31)

### Donjon (`/donjon`) — Basic shell
- 26 "levels", one per season matchday
- Past matchdays: real data (results, scores)
- Future matchdays: projected by the Oracle (Elo model)
- Navigation level-by-level (swipe or arrow buttons)
- This tab has its own epic/story to be defined

### Oracle (`/oracle`) — Placeholder
- "En construction" empty state
- Will contain model transparency: Brier Score, predictions history, data sources, corrections log (Epic 5, stories 5-1 and 5-2, FR25–FR28)

### Succès (header icon)
- Trophy icon top-right, all tabs
- Badge count = `computeAchievements(season).length` — achievements are computed dynamically from season data (no `achievements` field in JSON; `computeAchievements` is an existing export from `achievement-card.js`); badge re-computed when `season` store event fires
- Opens a bottom sheet rendering `computeAchievements(season)` cards via existing `achievement-card.js`

## Visual Design

### Color Palette — Prune Nuit
```css
--w-bg-page:     #130d1f;   /* fond page */
--w-bg-surface:  #1e1035;   /* cartes, surfaces */
--w-bg-elevated: #2e1a55;   /* éléments élevés */
--w-accent:      #c084fc;   /* accent principal */
--w-text-primary:   #ededef;
--w-text-secondary: #8a8f98;
--w-text-accent:    #e9d5ff;
```

### Bottom Nav Bar
- `backdrop-filter: blur(20px)`
- `border-top: 1px solid rgba(255,255,255,0.08)`
- Top edge gradient: `linear-gradient(90deg, transparent, rgba(192,132,252,0.4), transparent)`
- Active tab: glow `#7c3aed` (3px, box-shadow) under icon + label color `#c084fc` + bold
- Inactive: `rgba(255,255,255,0.3)`
- Min height: 56px + safe area inset bottom

### Tab Transitions
- Direction: new tab index > previous tab index → slide left (enter from right); otherwise → slide right (enter from left)
- Direction logic lives in `app.js`, which compares `activeTab` index against the previous value stored in a module-level variable `prevTabIndex`; the computed direction (`'left' | 'right'`) is passed to the transition function
- `activeTab` store key stores only the current tab; `prevTabIndex` is a local variable in `app.js`, not in the store
- **Initial load / direct URL navigation**: `prevTabIndex` is initialised to the index of the tab matching the current URL pathname; no transition animation plays on first render (instant render, no slide)
- Duration: 280ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Properties: `transform: translateX()` + `opacity` only (no layout properties)
- `prefers-reduced-motion`: opacity-only, zero translate

## Component Structure

### New files
```
src/components/bottom-nav.js        — 5-tab nav bar, active state, glow
src/components/bottom-nav.css
src/components/tab-projection.js    — projected standings view
src/components/tab-projection.css
src/components/tab-placeholder.js   — reusable "En construction" (Duels, Oracle)
src/components/tab-placeholder.css
src/components/tab-donjon.js        — basic donjon shell (26 levels)
src/components/tab-donjon.css
src/components/succes-sheet.js      — Succès bottom sheet (wraps achievement-card)
```

### Modified files
```
src/router.js           — +tab routing (pushState/popstate extended, ~+35 lines)
src/app.js              — orchestrates tab rendering, listens to activeTab store key;
                          existing `renderFullLayout()` is replaced: each tab gets its own
                          render function called when that tab becomes active; Classements
                          tab renders the existing score-card + zone-group + reveal-button
                          components (same as today, just scoped to that tab's container)
src/components/page-layout.js  — existing file (renders <main class="w-page-layout">);
                                  extended to add app header with Succès icon and
                                  padding-bottom equal to nav bar height + safe area
src/store.js            — adds activeTab key
src/styles/tokens.css   — adds --w-bg-page, --w-bg-surface, --w-bg-elevated (prune nuit)
```

### Store changes
Add to `EVENT_NAMES`: `activeTab: 'tab-changed'`
Add to `INITIAL_STATE`: `activeTab: 'classements'`

The initial value must be `'classements'` (not `null`) so that `prevTabIndex` in `app.js` is always computable from the first render.

### Existing components untouched
`score-card.js`, `rank-row.js`, `zone-group.js`, `confidence-bar.js`, `bottom-sheet.js`, `reveal-button.js`, `badge.js`, `empty-state.js`

## Accessibility

- Bottom nav: `role="navigation"`, `aria-label="Navigation principale"`
- Each nav item: native `<a href="...">` element (no explicit `role` needed); `aria-current="page"` on the active item
- Succès icon: `aria-label="Succès — X obtenus"`
- Tab content regions: `role="main"` with `aria-label` per tab
- Focus moves to tab content heading on tab switch
- Tab transition must not block input (UI stays interactive during animation)

## Out of Scope (this spec)

- Donjon feature content (match data, level interactions) — separate epic/story
- Duels feature (Epic 5, story 5-4)
- Oracle feature (Epic 5, stories 5-1, 5-2)
- Simulator tab (Epic 6)
- Dark/light mode toggle
