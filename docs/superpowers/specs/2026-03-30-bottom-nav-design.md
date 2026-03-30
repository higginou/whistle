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
if sheet open → close sheet (existing)
else          → browser handles back (navigates to previous tab)
```

**URL routing table:**
```
/            → Classements (default)
/projection  → Projection
/duels       → Duels
/donjon      → Donjon
/oracle      → Oracle
```

GitHub Pages compatibility: already handled by the 404.html redirect from story 4-3.

## Tab Contents

### Classements (`/`)
- **Score card La Rochelle** (hero, ~40% screen) — existing component, unchanged
- **Standings by zone** — 14 teams, zone groups — existing component, unchanged
- **"Révéler la Projection" button** — stays here as an interactive moment
- Achievement cards **removed** from here → relocated to Succès header sheet

### Projection (`/projection`)
- **Projected final standings** — always shown, no reveal interaction needed
- Reuses existing rank-row and confidence-bar components
- Reuses existing zone-group layout
- New: **season progress indicator** — "Journée X / 26 — confiance globale: X%"
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
- Badge showing achievement count
- Opens a bottom sheet with existing `achievement-card.js` content

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
- Direction: slide horizontal (left/right matching tab position in nav)
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
src/app.js              — orchestrates tab rendering, listens to activeTab store key
src/components/page-layout.js  — adds header with Succès icon + padding-bottom for nav
src/store.js            — adds activeTab key
src/styles/tokens.css   — adds --w-bg-page, --w-bg-surface, --w-bg-elevated (prune nuit)
```

### Store changes
New key: `activeTab` (string) — `'classements' | 'projection' | 'duels' | 'donjon' | 'oracle'`
Event: `tab-changed`

### Existing components untouched
`score-card.js`, `rank-row.js`, `zone-group.js`, `confidence-bar.js`, `bottom-sheet.js`, `reveal-button.js`, `badge.js`, `empty-state.js`

## Accessibility

- Bottom nav: `role="navigation"`, `aria-label="Navigation principale"`
- Each nav item: `role="link"` or `<a>` with `aria-current="page"` on active
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
