# Bottom Navigation Bar — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-scroll page with a 5-tab bottom navigation bar (Classements · Projection · Duels · Donjon · Oracle) plus a Succès header icon, using History API routing and a dark "prune nuit" gaming visual identity.

**Architecture:** History API pushState handles both tab routing (URL path changes) and sheet routing (state-only, existing). `app.js` orchestrates tab rendering: each tab has its own container rendered once and cached; switching tabs animates out/in with a directional horizontal slide. `page-layout.js` becomes the app shell (header + tab viewport); bottom-nav renders into `document.body` as a fixed element like the existing bottom-sheet.

**Tech Stack:** Vanilla JS ES modules, Vite 7, Vitest 4 + jsdom, Motion v12 (`animate` from `motion/mini`), existing store (EventTarget), existing bottom-sheet dialog pattern.

**Spec:** `docs/superpowers/specs/2026-03-30-bottom-nav-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/styles/tokens.css` | Modify | Add prune nuit palette tokens |
| `src/store.js` | Modify | Add `activeTab` key |
| `src/__tests__/store.test.js` | Modify | Add activeTab tests |
| `src/components/bottom-nav.js` | Create | 5-tab nav bar, active glow, click handling |
| `src/styles/components/bottom-nav.css` | Create | Nav bar styles |
| `src/__tests__/bottom-nav.test.js` | Create | Nav rendering + active state tests |
| `src/router.js` | Modify | Add `pushTab`, `tabFromCurrentPath`, update `onPopState` |
| `src/__tests__/router.test.js` | Modify | Add tab routing tests, update popstate test |
| `src/components/page-layout.js` | Modify | Return app shell (header + tab viewport) |
| `src/styles/components/page-layout.css` | Modify | App shell layout, header styles |
| `src/__tests__/page-layout.test.js` | Modify | Update for new shell structure |
| `src/components/tab-placeholder.js` | Create | Reusable "En construction" view (Duels, Oracle) |
| `src/styles/components/tab-placeholder.css` | Create | Placeholder styles |
| `src/components/succes-sheet.js` | Create | Achievement bottom sheet, badge count |
| `src/__tests__/succes-sheet.test.js` | Create | Open/close, badge count tests |
| `src/components/tab-projection.js` | Create | Projected standings view |
| `src/styles/components/tab-projection.css` | Create | Projection tab styles |
| `src/__tests__/tab-projection.test.js` | Create | Data rendering, progress indicator tests |
| `src/components/tab-donjon.js` | Create | Donjon shell (26 levels, basic list) |
| `src/styles/components/tab-donjon.css` | Create | Donjon styles |
| `src/app.js` | Modify | Tab orchestration, transitions, Succès badge wiring |
| `src/__tests__/app.test.js` | Modify | Update integration tests for tab architecture |

---

## Task 1: Design Tokens — Prune Nuit Palette

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Add dark palette tokens at the end of `:root` in `tokens.css`**

```css
/* ===== Dark Palette — Prune Nuit ===== */
--w-bg-page:         #130d1f;
--w-bg-surface:      #1e1035;
--w-bg-elevated:     #2e1a55;
--w-accent:          #c084fc;
--w-text-primary:    #ededef;
--w-text-secondary:  #8a8f98;
--w-text-accent:     #e9d5ff;

/* ===== Nav Bar ===== */
--w-nav-height: 60px;
```

- [ ] **Step 2: Apply background to `body` in `src/styles/base.css`**

In `src/styles/base.css`, find the `body` rule and make these two changes:
- REPLACE `background-color: var(--w-color-surface)` → `background-color: var(--w-bg-page)`
- ADD (or replace existing): `color: var(--w-text-primary)`

If there is no explicit `background-color` on `body`, add it. The goal is that the page background is `#130d1f` (prune nuit) not the existing cream/beige.

- [ ] **Step 3: Run tests — design-tokens test may need updating**

```bash
npx vitest run tests/design-tokens.test.js
```

If the test checks for specific token counts or names, update it to include the new tokens.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css src/styles/base.css tests/design-tokens.test.js
git commit -m "feat: design tokens prune nuit palette + nav height"
```

---

## Task 2: Store — Add `activeTab`

**Files:**
- Modify: `src/store.js`
- Modify: `src/__tests__/store.test.js`

- [ ] **Step 1: Write failing tests** — add to `src/__tests__/store.test.js`

```js
describe('activeTab', () => {
  it('has initial value classements', () => {
    expect(get('activeTab')).toBe('classements')
  })

  it('dispatches tab-changed event on set', () => {
    let received = null
    const unsub = on('activeTab', (event) => { received = event.detail })
    set('activeTab', 'projection')
    expect(received).toEqual({ value: 'projection', previous: 'classements' })
    unsub()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/__tests__/store.test.js
```

Expected: FAIL — `get('activeTab')` returns `undefined`.

- [ ] **Step 3: Add activeTab to store**

In `src/store.js`, add to `EVENT_NAMES`:
```js
activeTab: 'tab-changed',
```

Add to `INITIAL_STATE`:
```js
activeTab: 'classements',
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npx vitest run src/__tests__/store.test.js
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store.js src/__tests__/store.test.js
git commit -m "feat: store — add activeTab key (tab-changed event)"
```

---

## Task 3: Bottom Nav Component

**Files:**
- Create: `src/components/bottom-nav.js`
- Create: `src/styles/components/bottom-nav.css`
- Create: `src/__tests__/bottom-nav.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/bottom-nav.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, update } from '../components/bottom-nav.js'

describe('bottom-nav', () => {
  let nav

  beforeEach(() => {
    document.body.innerHTML = ''
    nav = render(document.body, 'classements')
  })

  it('renders a <nav> with role navigation', () => {
    expect(nav.tagName).toBe('NAV')
    expect(nav.getAttribute('role')).toBe('navigation')
    expect(nav.getAttribute('aria-label')).toBe('Navigation principale')
  })

  it('renders 5 tab links', () => {
    const links = nav.querySelectorAll('a.w-bottom-nav__item')
    expect(links).toHaveLength(5)
  })

  it('marks active tab with aria-current=page', () => {
    const active = nav.querySelector('[aria-current="page"]')
    expect(active).not.toBeNull()
    expect(active.dataset.tab).toBe('classements')
  })

  it('inactive tabs have aria-current=false', () => {
    const inactive = nav.querySelectorAll('[aria-current="false"]')
    expect(inactive).toHaveLength(4)
  })

  it('update() changes active tab', () => {
    update(nav, 'projection')
    const active = nav.querySelector('[aria-current="page"]')
    expect(active.dataset.tab).toBe('projection')
  })

  it('renders labels for all tabs', () => {
    const labels = [...nav.querySelectorAll('.w-bottom-nav__label')].map(el => el.textContent)
    expect(labels).toContain('Classement')
    expect(labels).toContain('Projection')
    expect(labels).toContain('Duels')
    expect(labels).toContain('Donjon')
    expect(labels).toContain('Oracle')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/__tests__/bottom-nav.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `bottom-nav.js`**

Create `src/components/bottom-nav.js`:

```js
import '../styles/components/bottom-nav.css'

const TABS = [
  {
    id: 'classements',
    label: 'Classement',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>',
  },
  {
    id: 'projection',
    label: 'Projection',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M2 12h3M19 12h3M12 2v3M12 19v3"/><path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
  },
  {
    id: 'duels',
    label: 'Duels',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6 2 2-6 6-2-2z"/><path d="M5 19l-2-2 6-6 2 2-6 6z"/></svg>',
  },
  {
    id: 'donjon',
    label: 'Donjon',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V9l4-6h10l4 6v12"/><path d="M9 21v-6h6v6"/><path d="M3 9h18"/></svg>',
  },
  {
    id: 'oracle',
    label: 'Oracle',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="10" ry="5"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(120 12 12)"/></svg>',
  },
]

/**
 * Render bottom nav into container.
 * Calls update() internally so active-state logic is not duplicated.
 * @param {HTMLElement} container
 * @param {string} activeTabId
 * @returns {HTMLElement} nav element
 */
export function render(container, activeTabId) {
  const nav = document.createElement('nav')
  nav.className = 'w-bottom-nav'
  nav.setAttribute('role', 'navigation')
  nav.setAttribute('aria-label', 'Navigation principale')

  // Render all items initially inactive; update() sets the active one
  nav.innerHTML = TABS.map((tab) => `
    <a
      class="w-bottom-nav__item"
      data-tab="${tab.id}"
      aria-current="false"
      href="#"
    >
      <span class="w-bottom-nav__icon">${tab.icon}</span>
      <span class="w-bottom-nav__label">${tab.label}</span>
      <span class="w-bottom-nav__glow" aria-hidden="true"></span>
    </a>
  `).join('')

  container.appendChild(nav)
  update(nav, activeTabId)
  return nav
}

/**
 * Update active tab state without re-rendering.
 * @param {HTMLElement} nav
 * @param {string} activeTabId
 */
export function update(nav, activeTabId) {
  nav.querySelectorAll('.w-bottom-nav__item').forEach((item) => {
    const isActive = item.dataset.tab === activeTabId
    item.classList.toggle('w-bottom-nav__item--active', isActive)
    item.setAttribute('aria-current', isActive ? 'page' : 'false')
  })
}

/** @returns {string[]} ordered tab IDs */
export function tabIds() {
  return TABS.map((t) => t.id)
}
```

- [ ] **Step 4: Create `src/styles/components/bottom-nav.css`**

```css
.w-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: var(--w-nav-height);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: rgba(19, 13, 31, 0.92);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.w-bottom-nav::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(192, 132, 252, 0.4), transparent);
}

.w-bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  padding: 6px 4px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.3);
  position: relative;
  min-height: 48px;
  justify-content: center;
  touch-action: manipulation;
  transition: color 150ms ease;
}

.w-bottom-nav__item--active {
  color: var(--w-accent);
}

.w-bottom-nav__icon svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  display: block;
}

.w-bottom-nav__label {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.04em;
  line-height: 1;
}

.w-bottom-nav__item--active .w-bottom-nav__label {
  font-weight: 700;
}

.w-bottom-nav__glow {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  border-radius: 2px;
  background: #7c3aed;
  box-shadow: 0 0 8px rgba(124, 58, 237, 0.8), 0 0 16px rgba(124, 58, 237, 0.4);
  opacity: 0;
  transition: opacity 150ms ease;
}

.w-bottom-nav__item--active .w-bottom-nav__glow {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .w-bottom-nav__item,
  .w-bottom-nav__glow {
    transition: none;
  }
}
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
npx vitest run src/__tests__/bottom-nav.test.js
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/bottom-nav.js src/styles/components/bottom-nav.css src/__tests__/bottom-nav.test.js
git commit -m "feat: bottom-nav component — 5 tabs, active glow, aria"
```

---

## Task 4: Router — Tab Routing

**Files:**
- Modify: `src/router.js`
- Modify: `src/__tests__/router.test.js`

- [ ] **Step 1: Write failing tests** — update `src/__tests__/router.test.js`

**Delete** the existing `popstate` test (the one that dispatches `new Event('popstate')` with no state object — it will be wrong once we update the handler). Replace the import line and add new blocks:

```js
import { pushSheet, pushTab, tabFromCurrentPath, init } from '../router.js'

// Add to existing vi.spyOn lines:
vi.spyOn(store, 'set')

describe('router', () => {
  // … existing non-popstate tests stay as-is …

  describe('pushTab', () => {
    it('calls pushState with tab state', () => {
      pushTab('projection')
      expect(history.pushState).toHaveBeenCalledWith(
        { tab: 'projection' },
        '',
        expect.stringContaining('projection'),
      )
    })

    it('sets activeTab in store', () => {
      pushTab('donjon')
      expect(store.set).toHaveBeenCalledWith('activeTab', 'donjon')
    })
  })

  describe('tabFromCurrentPath', () => {
    it('returns classements for root path', () => {
      history.pushState({}, '', '/')
      expect(tabFromCurrentPath()).toBe('classements')
    })

    it('returns projection for /projection path', () => {
      // jsdom: set location via pushState
      history.pushState({}, '', '/projection')
      expect(tabFromCurrentPath()).toBe('projection')
      history.pushState({}, '', '/')
    })

    it('returns oracle for /whistle/oracle path', () => {
      history.pushState({}, '', '/whistle/oracle')
      expect(tabFromCurrentPath()).toBe('oracle')
      history.pushState({}, '', '/')
    })
  })

  describe('popstate — updated handler', () => {
    it('closes sheet when state has sheet property', () => {
      init()
      window.dispatchEvent(
        Object.assign(new Event('popstate'), { state: { sheet: 'team-detail' } })
      )
      expect(store.set).toHaveBeenCalledWith('activeSheet', null)
    })

    it('does NOT close sheet when state is null', () => {
      store.set.mockClear()
      init()
      window.dispatchEvent(
        Object.assign(new Event('popstate'), { state: null })
      )
      expect(store.set).not.toHaveBeenCalledWith('activeSheet', null)
    })

    it('does NOT close sheet when state has only tab property', () => {
      store.set.mockClear()
      init()
      window.dispatchEvent(
        Object.assign(new Event('popstate'), { state: { tab: 'projection' } })
      )
      expect(store.set).not.toHaveBeenCalledWith('activeSheet', null)
    })
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/__tests__/router.test.js
```

Expected: FAIL on new tests. The existing `popstate` test will also fail once we update the handler.

- [ ] **Step 3: Rewrite `src/router.js`**

```js
/** @module router — History API router for tabs and sheets */

import { set } from './store.js'

/** Ordered tab IDs matching bottom nav order. */
const TAB_IDS = ['classements', 'projection', 'duels', 'donjon', 'oracle']

/**
 * Derive active tab from current pathname.
 * Works with or without a base path (e.g., /whistle/).
 * @returns {string} tab ID
 */
export function tabFromCurrentPath() {
  const pathname = window.location.pathname
  for (const id of TAB_IDS) {
    if (id === 'classements') continue
    if (pathname.endsWith(`/${id}`)) return id
  }
  return 'classements'
}

/**
 * Push a tab navigation state.
 * Builds path by replacing the current tab suffix.
 * @param {string} tabId
 */
export function pushTab(tabId) {
  const base = window.location.pathname.replace(
    /\/(projection|duels|donjon|oracle)$/,
    '',
  )
  const suffix = tabId === 'classements' ? '' : `/${tabId}`
  const path = `${base}${suffix}` || '/'
  history.pushState({ tab: tabId }, '', path)
  set('activeTab', tabId)
}

/**
 * Push a bottom-sheet state on top of current tab URL.
 * @param {string} sheetId
 */
export function pushSheet(sheetId) {
  history.pushState({ sheet: sheetId }, '')
  set('activeSheet', sheetId)
}

/**
 * Handle back navigation. Inspects event.state to distinguish sheet vs tab pops.
 * - state has `sheet` → sheet pop: close sheet
 * - state has `tab` (but no `sheet`) → tab pop: sync activeTab store from state
 * - state is null → initial load or unknown: sync activeTab from current pathname
 * app.js MUST NOT add its own popstate listener — it listens to the activeTab store event.
 */
function onPopState(event) {
  if (event.state?.sheet) {
    set('activeSheet', null)
  } else {
    // Tab pop or initial replaceState: sync store from state.tab or current pathname
    const tabId = event.state?.tab ?? tabFromCurrentPath()
    set('activeTab', tabId)
  }
}

/** Initialize router (call once at startup). */
export function init() {
  window.addEventListener('popstate', onPopState)
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npx vitest run src/__tests__/router.test.js
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/router.js src/__tests__/router.test.js
git commit -m "feat: router — pushTab, tabFromCurrentPath, state-aware popstate"
```

---

## Task 5: Page Layout — App Shell

**Files:**
- Modify: `src/components/page-layout.js`
- Modify: `src/styles/components/page-layout.css`
- Modify: `src/__tests__/page-layout.test.js`

- [ ] **Step 1: Replace `src/__tests__/page-layout.test.js` entirely**

**Delete ALL old tests** — the existing file checks for `<MAIN>`, class `w-page-layout`, and 5 named sections (hero, achievements, reveal, standings, schedule). ALL of these will be wrong after the rewrite. Replace the file with:

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '../components/page-layout.js'

describe('page-layout', () => {
  let shell

  beforeEach(() => {
    shell = render()
  })

  it('returns a <div> app shell', () => {
    expect(shell.tagName).toBe('DIV')
    expect(shell.classList.contains('w-app-shell')).toBe(true)
  })

  it('contains an app header', () => {
    const header = shell.querySelector('.w-app-header')
    expect(header).not.toBeNull()
    expect(header.tagName).toBe('HEADER')
  })

  it('header has logo', () => {
    const logo = shell.querySelector('.w-app-header__logo')
    expect(logo).not.toBeNull()
    expect(logo.textContent).toContain('Whistle')
  })

  it('header has Succès button with aria-label', () => {
    const btn = shell.querySelector('.w-succes-btn')
    expect(btn).not.toBeNull()
    expect(btn.getAttribute('aria-label')).toMatch(/Succ/)
  })

  it('contains a tab viewport', () => {
    const viewport = shell.querySelector('.w-tab-viewport')
    expect(viewport).not.toBeNull()
    expect(viewport.getAttribute('role')).toBe('main')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/__tests__/page-layout.test.js
```

Expected: FAIL — shell structure doesn't match yet.

- [ ] **Step 3: Rewrite `src/components/page-layout.js`**

```js
import '../styles/components/page-layout.css'

const TROPHY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true" width="18" height="18">
  <path d="M8 21h8M12 17v4M17 3H7l1 7a4 4 0 008 0l1-7z"/>
  <path d="M17 3c0 0 2 0 2 3s-2 4-2 4M7 3c0 0-2 0-2 3s2 4 2 4"/>
</svg>`

/**
 * Render app shell: header (logo + Succès button) + tab viewport.
 * @returns {HTMLElement}
 */
export function render() {
  const shell = document.createElement('div')
  shell.className = 'w-app-shell'

  shell.innerHTML = `
    <header class="w-app-header" role="banner">
      <span class="w-app-header__logo" aria-label="Whistle">Whistle</span>
      <button class="w-succes-btn" aria-label="Succès — 0 obtenus" type="button">
        ${TROPHY_SVG}
        <span class="w-succes-btn__badge" aria-hidden="true" hidden>0</span>
      </button>
    </header>
    <div class="w-tab-viewport" role="main" aria-label="Classements"></div>
  `

  return shell
}
```

- [ ] **Step 4: Update `src/styles/components/page-layout.css`**

Replace the existing file content with:

```css
/* App shell */
.w-app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--w-bg-page);
}

/* App header */
.w-app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--w-space-md);
  background: rgba(19, 13, 31, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.w-app-header__logo {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--w-accent);
}

.w-succes-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(192, 132, 252, 0.25);
  background: rgba(192, 132, 252, 0.1);
  color: var(--w-accent);
  cursor: pointer;
  touch-action: manipulation;
  min-width: 44px;
  min-height: 44px;
}

.w-succes-btn:active {
  transform: scale(0.97);
}

.w-succes-btn__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #7c3aed;
  border: 2px solid var(--w-bg-page);
  font-size: 8px;
  font-weight: 800;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* Tab viewport */
.w-tab-viewport {
  flex: 1;
  overflow: hidden;
  padding-bottom: calc(var(--w-nav-height) + env(safe-area-inset-bottom, 0px));
  position: relative;
}

/* Individual tab view containers */
.w-tab-view {
  width: 100%;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .w-succes-btn:active {
    transform: none;
  }
}
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
npx vitest run src/__tests__/page-layout.test.js
```

Expected: all PASS.

- [ ] **Step 6: Run full suite to catch regressions**

```bash
npx vitest run
```

The `app.test.js` will fail because it still expects `.w-page-layout`. Note these failures — they'll be fixed in Task 10.

- [ ] **Step 7: Commit**

```bash
git add src/components/page-layout.js src/styles/components/page-layout.css src/__tests__/page-layout.test.js
git commit -m "feat: page-layout — app shell with header and tab viewport"
```

---

## Task 6: Tab Placeholder Component

**Files:**
- Create: `src/components/tab-placeholder.js`
- Create: `src/styles/components/tab-placeholder.css`

No dedicated tests needed — this is a pure rendering utility with no logic. It will be covered by integration tests in Task 10.

- [ ] **Step 1: Create `src/components/tab-placeholder.js`**

The **first line** of the file must be the CSS import so Vite bundles the styles:

```js
import '../styles/components/tab-placeholder.css'

/**
 * Render a "coming soon" placeholder into container.
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.title — tab name
 * @param {string} options.description — feature description
 */
export function render(container, { title, description }) {
  const el = document.createElement('div')
  el.className = 'w-tab-placeholder'

  el.innerHTML = `
    <div class="w-tab-placeholder__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    </div>
    <h2 class="w-tab-placeholder__title">${title}</h2>
    <p class="w-tab-placeholder__desc">${description}</p>
  `

  container.appendChild(el)
  return el
}
```

- [ ] **Step 2: Create `src/styles/components/tab-placeholder.css`**

```css
.w-tab-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: var(--w-space-xl);
  text-align: center;
  gap: var(--w-space-md);
}

.w-tab-placeholder__icon {
  color: rgba(255, 255, 255, 0.15);
}

.w-tab-placeholder__title {
  font-size: var(--w-text-h2);
  font-weight: 700;
  color: var(--w-text-secondary);
  letter-spacing: 0.04em;
}

.w-tab-placeholder__desc {
  font-size: var(--w-text-body);
  color: rgba(255, 255, 255, 0.25);
  line-height: 1.6;
  max-width: 280px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tab-placeholder.js src/styles/components/tab-placeholder.css
git commit -m "feat: tab-placeholder — reusable En construction view"
```

---

## Task 7: Succès Sheet Component

**Files:**
- Create: `src/components/succes-sheet.js`
- Create: `src/__tests__/succes-sheet.test.js`

The Succès sheet follows the same `<dialog>` + `showModal()` pattern as `bottom-sheet.js`. It wraps `computeAchievements` from `achievement-card.js`.

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/succes-sheet.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { render, open, close, updateBadge } from '../components/succes-sheet.js'

// jsdom doesn't implement showModal/close on <dialog>.
// Polyfill MUST go in beforeAll (not at module top-level — imports are hoisted
// so the prototype assignment would run before jsdom is set up).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.removeAttribute('open')
  })
})

const MOCK_SEASON = {
  teams: [{ id: 'la-rochelle', name: 'La Rochelle', currentRank: 3, projectedRank: 2, trend: 'up' }],
  predictions: [],
}

describe('succes-sheet', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    render(document.body)
  })

  it('renders a <dialog> into container', () => {
    expect(document.querySelector('dialog.w-succes-sheet')).not.toBeNull()
  })

  it('open() calls showModal', () => {
    open(MOCK_SEASON)
    const dialog = document.querySelector('dialog.w-succes-sheet')
    expect(dialog.showModal).toHaveBeenCalled()
  })

  it('close() removes open attribute', () => {
    open(MOCK_SEASON)
    close()
    const dialog = document.querySelector('dialog.w-succes-sheet')
    expect(dialog.hasAttribute('open')).toBe(false)
  })

  it('updateBadge() sets badge text and shows it', () => {
    updateBadge(document.body, 2)
    const badge = document.querySelector('.w-succes-btn__badge')
    expect(badge.textContent).toBe('2')
    expect(badge.hidden).toBe(false)
  })

  it('updateBadge() hides badge when count is 0', () => {
    updateBadge(document.body, 0)
    const badge = document.querySelector('.w-succes-btn__badge')
    expect(badge.hidden).toBe(true)
  })
})
```

Note: `updateBadge` requires the `.w-succes-btn__badge` element to exist in the container. In the test, `render()` adds the dialog but the badge is in the header (rendered by `page-layout`). The test needs a badge element in the DOM — add it in `beforeEach`:

```js
beforeEach(() => {
  document.body.innerHTML = '<button class="w-succes-btn"><span class="w-succes-btn__badge" hidden>0</span></button>'
  render(document.body)
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/__tests__/succes-sheet.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/succes-sheet.js`**

```js
import { computeAchievements, render as renderCards } from './achievement-card.js'

let dialog = null

/**
 * Create the Succès dialog and append to container.
 * Call once at startup.
 * @param {HTMLElement} container — typically document.body
 */
export function render(container) {
  dialog = document.createElement('dialog')
  dialog.className = 'w-succes-sheet'
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', 'Succès')

  dialog.innerHTML = `
    <div class="w-succes-sheet__handle" aria-hidden="true"></div>
    <h2 class="w-succes-sheet__title">Succès</h2>
    <div class="w-succes-sheet__content"></div>
  `

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close()
  })

  container.appendChild(dialog)
}

/**
 * Open the Succès sheet with current season data.
 * @param {object} season
 */
export function open(season) {
  if (!dialog) return
  const content = dialog.querySelector('.w-succes-sheet__content')
  content.innerHTML = ''
  renderCards(content, season)
  dialog.showModal()
}

/** Close the Succès sheet. */
export function close() {
  dialog?.close()
}

/**
 * Update the badge count in the header button.
 * @param {HTMLElement} root — element containing .w-succes-btn__badge
 * @param {number} count
 */
export function updateBadge(root, count) {
  const badge = root.querySelector('.w-succes-btn__badge')
  if (!badge) return
  badge.textContent = String(count)
  badge.hidden = count === 0
  const btn = root.querySelector('.w-succes-btn')
  if (btn) btn.setAttribute('aria-label', `Succès — ${count} obtenus`)
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npx vitest run src/__tests__/succes-sheet.test.js
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/succes-sheet.js src/__tests__/succes-sheet.test.js
git commit -m "feat: succes-sheet — achievement dialog, badge count, open/close"
```

---

## Task 8: Tab Projection Component

**Files:**
- Create: `src/components/tab-projection.js`
- Create: `src/styles/components/tab-projection.css`
- Create: `src/__tests__/tab-projection.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/tab-projection.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '../components/tab-projection.js'

const MOCK_SEASON = {
  matchday: 18,
  teams: [
    { id: 'toulouse', name: 'Toulouse', currentRank: 1, projectedRank: 1, elo: 1600, confidence: 0.85, zones: {}, form: [], trend: 'stable' },
    { id: 'la-rochelle', name: 'La Rochelle', currentRank: 3, projectedRank: 2, elo: 1575, confidence: 0.70, zones: {}, form: [], trend: 'up' },
    { id: 'bordeaux', name: 'Bordeaux', currentRank: 2, projectedRank: 3, elo: 1560, confidence: 0.55, zones: {}, form: [], trend: 'down' },
  ],
}

describe('tab-projection', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    render(container, MOCK_SEASON)
  })

  it('renders the season progress indicator', () => {
    const indicator = container.querySelector('.w-projection-progress')
    expect(indicator).not.toBeNull()
    expect(indicator.textContent).toContain('18')
    expect(indicator.textContent).toContain('26')
  })

  it('shows confiance globale as percentage', () => {
    // Mean of 0.85 + 0.70 + 0.55 = 0.70 → 70%
    const indicator = container.querySelector('.w-projection-progress')
    expect(indicator.textContent).toContain('70')
  })

  it('renders teams sorted by projectedRank', () => {
    const names = [...container.querySelectorAll('.w-rank-row')]
      .map(el => el.querySelector('[data-field="name"]')?.textContent ?? el.textContent)
    // Just verify teams are rendered
    expect(names.length).toBeGreaterThan(0)
  })

  it('does NOT render a reveal button', () => {
    expect(container.querySelector('.w-reveal-btn')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/__tests__/tab-projection.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/tab-projection.js`**

**Important:** `zone-group.js` assigns zone groups using `team.currentRank` — it knows nothing about `projectedRank`. To display projected standings in the correct zone groups, remap `projectedRank` onto `currentRank` before passing teams to `renderZoneGroups`. This means zone group boundaries (top 6 Champions Cup, etc.) will reflect the projected final standings, not the live standings. The `currentRank` field in the remapped objects is intentionally overwritten only for zone display — original team objects are not mutated.

The **first line** of the file must be the CSS import:

```js
import '../styles/components/tab-projection.css'
import { render as renderZoneGroups } from './zone-group.js'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Render projected standings into container.
 * Teams are sorted by projectedRank; projectedRank is mapped onto currentRank
 * so zone-group.js assigns zones correctly for the projected final standings.
 * @param {HTMLElement} container
 * @param {object} season
 */
export function render(container, season) {
  const meanConfidence = season.teams.length > 0
    ? Math.round(season.teams.reduce((sum, t) => sum + t.confidence, 0) / season.teams.length * 100)
    : 0

  const progress = document.createElement('div')
  progress.className = 'w-projection-progress'
  progress.setAttribute('aria-label', `Journée ${esc(season.matchday)} sur 26, confiance globale ${meanConfidence} pour cent`)
  progress.innerHTML = `
    <span class="w-projection-progress__label">Journée</span>
    <span class="w-projection-progress__value">${esc(season.matchday)} / 26</span>
    <span class="w-projection-progress__sep">·</span>
    <span class="w-projection-progress__label">Confiance</span>
    <span class="w-projection-progress__value">${meanConfidence}%</span>
  `

  const standingsEl = document.createElement('div')
  standingsEl.className = 'w-projection-standings'

  // Sort by projectedRank, then remap projectedRank → currentRank so zone-group.js
  // assigns zone groups based on projected final standings (not current standings).
  const sorted = [...season.teams]
    .sort((a, b) => a.projectedRank - b.projectedRank)
    .map((t) => ({ ...t, currentRank: t.projectedRank }))
  renderZoneGroups(standingsEl, sorted)

  container.appendChild(progress)
  container.appendChild(standingsEl)
}
```

- [ ] **Step 4: Create `src/styles/components/tab-projection.css`**

```css
.w-projection-progress {
  display: flex;
  align-items: center;
  gap: var(--w-space-sm);
  padding: var(--w-space-md) var(--w-space-md) var(--w-space-sm);
  font-size: var(--w-text-caption);
  color: var(--w-text-secondary);
}

.w-projection-progress__value {
  font-weight: 700;
  color: var(--w-accent);
  font-variant-numeric: tabular-nums;
}

.w-projection-progress__sep {
  color: rgba(255, 255, 255, 0.15);
}

.w-projection-standings {
  padding: 0 var(--w-space-md);
}
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
npx vitest run src/__tests__/tab-projection.test.js
```

Expected: all PASS. If `zone-group.js` imports fail in jsdom, mock them:
```js
vi.mock('../components/zone-group.js', () => ({ render: vi.fn() }))
```

- [ ] **Step 6: Commit**

```bash
git add src/components/tab-projection.js src/styles/components/tab-projection.css src/__tests__/tab-projection.test.js
git commit -m "feat: tab-projection — projected standings with progress indicator"
```

---

## Task 9: Tab Donjon Shell

**Files:**
- Create: `src/components/tab-donjon.js`
- Create: `src/styles/components/tab-donjon.css`

No tests for the shell — it renders only a structural list with no logic. Content implementation is out of scope.

- [ ] **Step 1: Create `src/components/tab-donjon.js`**

The **first line** must be the CSS import:

```js
import '../styles/components/tab-donjon.css'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Render the Donjon tab shell.
 * Shows 26 matchday slots; past ones marked as completed, future as upcoming.
 * @param {HTMLElement} container
 * @param {object} season
 */
export function render(container, season) {
  const TOTAL = 26
  const current = season?.matchday ?? 0

  const header = document.createElement('div')
  header.className = 'w-donjon-header'
  header.innerHTML = `
    <h2 class="w-donjon-title">Donjon — Saison 2025·26</h2>
    <p class="w-donjon-subtitle">26 journées · ${esc(current)} jouées</p>
  `

  const list = document.createElement('ol')
  list.className = 'w-donjon-list'
  list.setAttribute('aria-label', 'Journées de la saison')

  for (let i = 1; i <= TOTAL; i++) {
    const li = document.createElement('li')
    const isPast = i < current
    const isCurrent = i === current
    li.className = `w-donjon-item${isPast ? ' w-donjon-item--past' : ''}${isCurrent ? ' w-donjon-item--current' : ''}`
    li.setAttribute('aria-label', `Journée ${i}${isPast ? ', terminée' : isCurrent ? ', en cours' : ''}`)
    li.innerHTML = `
      <span class="w-donjon-item__num">${i}</span>
      <span class="w-donjon-item__label">Journée ${i}</span>
      <span class="w-donjon-item__status" aria-hidden="true">${isPast ? '✓' : isCurrent ? '▶' : '🔒'}</span>
    `
    list.appendChild(li)
  }

  container.appendChild(header)
  container.appendChild(list)
}
```

- [ ] **Step 2: Create `src/styles/components/tab-donjon.css`**

```css
.w-donjon-header {
  padding: var(--w-space-md) var(--w-space-md) var(--w-space-sm);
}

.w-donjon-title {
  font-size: var(--w-text-h2);
  font-weight: 700;
  color: var(--w-text-primary);
  letter-spacing: 0.04em;
}

.w-donjon-subtitle {
  font-size: var(--w-text-caption);
  color: var(--w-text-secondary);
  margin-top: var(--w-space-xs);
}

.w-donjon-list {
  list-style: none;
  padding: 0 var(--w-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--w-space-xs);
}

.w-donjon-item {
  display: flex;
  align-items: center;
  gap: var(--w-space-sm);
  padding: 12px var(--w-space-md);
  border-radius: var(--w-radius-card);
  background: var(--w-bg-surface);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 48px;
}

.w-donjon-item--past {
  opacity: 0.5;
}

.w-donjon-item--current {
  border-color: rgba(192, 132, 252, 0.35);
  background: rgba(192, 132, 252, 0.08);
}

.w-donjon-item__num {
  font-size: var(--w-text-caption);
  font-weight: 700;
  color: var(--w-text-secondary);
  font-variant-numeric: tabular-nums;
  width: 20px;
}

.w-donjon-item__label {
  flex: 1;
  font-size: var(--w-text-body);
  color: var(--w-text-primary);
}

.w-donjon-item__status {
  font-size: 12px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tab-donjon.js src/styles/components/tab-donjon.css
git commit -m "feat: tab-donjon — 26-matchday shell with past/current/future states"
```

---

## Task 10: App.js — Tab Orchestration + Transitions

This task rewrites `app.js` to orchestrate tabs, transitions, and the Succès badge. It also fixes the failing `app.test.js`.

**Files:**
- Modify: `src/app.js`
- Modify: `src/__tests__/app.test.js`

- [ ] **Step 1: Write new app integration tests**

Replace the contents of `src/__tests__/app.test.js`:

```js
// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => vi.fn()) }))
vi.mock('../data.js', () => ({ loadSeason: vi.fn() }))
vi.mock('../router.js', () => ({
  init: vi.fn(),
  tabFromCurrentPath: vi.fn(() => 'classements'),
  pushTab: vi.fn(),
  pushSheet: vi.fn(),
}))
vi.mock('motion/mini', () => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
}))

describe('app integration', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = '<div id="app"></div>'
  })

  it('renders app shell on season load', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    set('season', { id: '2025-2026', matchday: 10, teams: [], predictions: [], calendar: [] })
    const shell = document.querySelector('.w-app-shell')
    expect(shell).not.toBeNull()
  })

  it('renders bottom nav on season load', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    set('season', { id: '2025-2026', matchday: 10, teams: [], predictions: [], calendar: [] })
    const nav = document.querySelector('.w-bottom-nav')
    expect(nav).not.toBeNull()
  })

  it('shows empty state when season is null', async () => {
    const { set } = await import('../store.js')
    await import('../app.js')
    set('season', null)
    const fallback = document.querySelector('.w-empty-state')
    expect(fallback).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm existing failures**

```bash
npx vitest run src/__tests__/app.test.js
```

Expected: FAIL (module structure has changed).

- [ ] **Step 3: Rewrite `src/app.js`**

```js
import './styles/base.css'
import { registerSW } from 'virtual:pwa-register'
import { animate } from 'motion/mini'
import { get, set, on } from './store.js'
import { loadSeason } from './data.js'
import { init as initRouter, tabFromCurrentPath, pushTab, pushSheet } from './router.js'
import { render as renderLayout } from './components/page-layout.js'
import { render as renderBottomNav, update as updateBottomNav, tabIds } from './components/bottom-nav.js'
import { render as renderScoreCard } from './components/score-card.js'
import { render as renderZoneGroups } from './components/zone-group.js'
import { render as renderRevealButton } from './components/reveal-button.js'
import { render as renderEmptyState } from './components/empty-state.js'
import { render as renderBottomSheet, open as openBottomSheet, close as closeBottomSheet } from './components/bottom-sheet.js'
import { render as renderSuccesSheet, open as openSucces, updateBadge } from './components/succes-sheet.js'
import { render as renderProjection } from './components/tab-projection.js'
import { render as renderPlaceholder } from './components/tab-placeholder.js'
import { render as renderDonjon } from './components/tab-donjon.js'
import { computeAchievements } from './components/achievement-card.js'

const appEl = document.querySelector('#app')
const TAB_ORDER = tabIds()

let shell = null
let nav = null
let viewport = null
let prevTabIndex = 0

// Tab view cache: tabId → div element
const tabViews = new Map()

function getTabIndex(tabId) {
  return TAB_ORDER.indexOf(tabId)
}

function renderTabContent(tabId, container) {
  const season = get('season')
  switch (tabId) {
    case 'classements': {
      const hero = document.createElement('section')
      hero.className = 'w-hero-section'
      hero.setAttribute('aria-label', 'Equipe favorite')
      const reveal = document.createElement('section')
      reveal.className = 'w-reveal-section'
      const standings = document.createElement('section')
      standings.className = 'w-standings-section'
      standings.setAttribute('aria-label', 'Classement')
      standings.innerHTML = '<h2 class="w-standings-title">Classement</h2>'
      container.append(hero, reveal, standings)
      renderScoreCard(hero)
      renderRevealButton(reveal)
      if (season && Array.isArray(season.teams)) {
        const sorted = [...season.teams].sort((a, b) => a.currentRank - b.currentRank)
        renderZoneGroups(standings, sorted)
      }
      break
    }
    case 'projection':
      if (season) renderProjection(container, season)
      break
    case 'duels':
      renderPlaceholder(container, {
        title: 'Duels',
        description: 'Micro-classement des confrontations directes entre équipes. Bientôt disponible.',
      })
      break
    case 'donjon':
      renderDonjon(container, season)
      break
    case 'oracle':
      renderPlaceholder(container, {
        title: 'Oracle',
        description: 'Transparence du modèle Elo : Brier Score, historique des prédictions, sources de données. Bientôt disponible.',
      })
      break
  }
}

function getOrCreateTabView(tabId) {
  if (tabViews.has(tabId)) return tabViews.get(tabId)
  const div = document.createElement('div')
  div.className = 'w-tab-view'
  div.hidden = true
  renderTabContent(tabId, div)
  viewport.appendChild(div)
  tabViews.set(tabId, div)
  return div
}

async function showTab(tabId, instant = false) {
  const newIndex = getTabIndex(tabId)
  const direction = newIndex > prevTabIndex ? 'left' : 'right'
  const outView = [...tabViews.values()].find((v) => !v.hidden) ?? null
  const inView = getOrCreateTabView(tabId)

  // Update nav active state
  if (nav) updateBottomNav(nav, tabId)
  // Update viewport aria-label
  if (viewport) viewport.setAttribute('aria-label', tabId)

  if (instant || !outView || outView === inView) {
    if (outView && outView !== inView) outView.hidden = true
    inView.hidden = false
    prevTabIndex = newIndex
    return
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  inView.hidden = false

  if (prefersReduced) {
    outView.hidden = true
    prevTabIndex = newIndex
    return
  }

  const outX = direction === 'left' ? '-30%' : '30%'
  const inX = direction === 'left' ? '30%' : '-30%'
  const opts = { duration: 0.28, easing: [0.16, 1, 0.3, 1] }

  animate(outView, { transform: [`translateX(0)`, `translateX(${outX})`], opacity: [1, 0] }, opts)
  animate(inView, { transform: [`translateX(${inX})`, `translateX(0)`], opacity: [0, 1] }, opts)

  // Hide outgoing after animation
  setTimeout(() => { outView.hidden = true }, 300)
  prevTabIndex = newIndex
}

function renderFullLayout() {
  shell = renderLayout()
  appEl.replaceChildren(shell)
  viewport = shell.querySelector('.w-tab-viewport')

  // Bottom nav
  nav = renderBottomNav(document.body, get('activeTab') || 'classements')

  // Bottom sheet (team detail)
  renderBottomSheet(document.body)

  // Succès sheet
  renderSuccesSheet(document.body)

  // Succès button handler
  const succesBtn = shell.querySelector('.w-succes-btn')
  if (succesBtn) {
    succesBtn.addEventListener('click', () => {
      const season = get('season')
      if (season) openSucces(season)
    })
  }

  // Nav click handler — pushTab calls set('activeTab', tabId),
  // which fires on('activeTab', ...) which calls showTab(). No direct showTab here.
  nav.addEventListener('click', (e) => {
    const item = e.target.closest('[data-tab]')
    if (!item) return
    e.preventDefault()
    const tabId = item.dataset.tab
    if (tabId !== get('activeTab')) pushTab(tabId)
  })

  // Initial tab (from URL or store)
  const initialTab = tabFromCurrentPath()
  set('activeTab', initialTab)
  prevTabIndex = getTabIndex(initialTab)
  showTab(initialTab, true)
}

// Listen for season data
on('season', (event) => {
  const { value } = event.detail
  if (value) {
    renderFullLayout()
    // Update Succès badge
    const count = computeAchievements(value).length
    updateBadge(shell, count)
  } else {
    renderEmptyState(appEl)
  }
})

// Open bottom sheet when a team is selected
on('selectedTeam', (event) => {
  const { value: teamId } = event.detail
  if (!teamId) return
  if (get('activeSheet') !== 'team-detail') return
  const season = get('season')
  if (!season || !Array.isArray(season.teams)) return
  const team = season.teams.find((t) => t.id === teamId)
  if (team) openBottomSheet(team, season)
})

// Close bottom sheet on activeSheet clear
on('activeSheet', (event) => {
  const { value } = event.detail
  if (value === null) {
    set('selectedTeam', null)
    closeBottomSheet()
  }
})

// Tab sync: router.js owns the popstate listener and calls set('activeTab', ...).
// app.js listens to the store event — no second popstate listener here.
on('activeTab', (event) => {
  const { value: tabId } = event.detail
  if (tabId) showTab(tabId)
})

// Register Service Worker
registerSW({
  immediate: true,
  onOfflineReady() { console.log('[SW] Offline ready') },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      setInterval(() => { registration.update() }, 60 * 60 * 1000)
    }
  },
  onRegisterError(error) { console.error('[SW] Registration failed:', error) },
})

initRouter()
loadSeason()
```

- [ ] **Step 4: Run new app tests**

```bash
npx vitest run src/__tests__/app.test.js
```

Expected: all PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass. If any test fails due to the restructuring, fix it:
- `page-layout.test.js` — already updated in Task 5
- `router.test.js` — already updated in Task 4
- Any CSS import errors in jsdom: vitest config handles CSS via `css: { modules: { ... } }` or `?` ignoring

- [ ] **Step 6: Commit**

```bash
git add src/app.js src/__tests__/app.test.js
git commit -m "feat: app — tab orchestration, transitions, Succes badge wiring"
```

---

## Task 11: Final Integration + Cleanup

- [ ] **Step 1: Create `public/404.html` for GitHub Pages SPA routing**

GitHub Pages serves a 404 for any URL that doesn't map to a static file (e.g. `/whistle/projection`). The Workbox `navigateFallback` only intercepts requests when the service worker is active — direct navigation before the SW is installed will 404. Create `public/404.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Whistle</title>
    <script>
      // Redirect to the SPA root while preserving the intended path.
      // Uses replaceState with a non-null state object so onPopState
      // in router.js sees state !== null on initial load.
      var path = window.location.pathname;
      history.replaceState({ redirected: true }, '', path);
      window.location.replace('/whistle/');
    </script>
  </head>
</html>
```

Note: the full deep-link restoration (reading back the original path) is out of scope for Phase 1. The 404.html simply redirects to the app root so the user gets a working app instead of a GitHub Pages error page.

- [ ] **Step 2: Run complete test suite**

```bash
npx vitest run
```

Expected: 0 failures. Fix any remaining regressions before proceeding.

- [ ] **Step 3: Verify build compiles cleanly**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds, no TypeScript or import errors. Check that bundle size is within budget: `< 200Ko gzipped`.

- [ ] **Step 4: Manual smoke test in browser**

```bash
npm run dev
```

Open `http://localhost:5173/whistle/` and verify:
- [ ] Dark prune nuit background loads
- [ ] "Whistle" logo visible in header, trophy icon top-right
- [ ] Bottom nav shows 5 tabs: Classement, Projection, Duels, Donjon, Oracle
- [ ] Classements tab renders score card + standings
- [ ] Tap Projection → projected standings + progress indicator visible
- [ ] Tap Duels → "En construction" placeholder
- [ ] Tap Oracle → "En construction" placeholder
- [ ] Tap Donjon → 26-level list, current matchday highlighted
- [ ] Trophy icon opens Succès sheet with achievement cards
- [ ] Tap any team row → bottom sheet opens, back button closes it
- [ ] Back button from Projection tab → returns to Classements tab
- [ ] Tab slide animation is directional (right→left going forward, left→right going back)

- [ ] **Step 5: Verify with `prefers-reduced-motion`**

In Chrome DevTools → Rendering → Emulate prefers-reduced-motion: reduce. Tab switches should show/hide instantly with no translate animation.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: story bottom-nav — navigation bar complete, prune nuit dark theme"
```

---

## Notes for Implementer

- **CSS imports in tests**: Vitest is configured to handle CSS imports via the `css` option or a transform. If CSS imports cause errors in jsdom tests, check `vitest.config.js` or add `vi.mock('../styles/components/foo.css', () => ({}))`.
- **`motion/mini` in tests**: mock it with `vi.mock('motion/mini', () => ({ animate: vi.fn(() => ({ finished: Promise.resolve() })) }))`.
- **GitHub Pages 404 shim**: A `public/404.html` is needed (created in Task 11 Step 1) for direct URL navigation before the service worker is installed. The Workbox `navigateFallback` only works once the SW is cached. The 404.html redirects to the app root; the router reads the current pathname on startup to set the correct initial tab.
- **Tab content re-render**: `tabViews` caches rendered tabs. If season data changes after initial render, the Projection tab may show stale data. For Phase 1 this is acceptable (data loads once at startup). Future: add a `refresh()` export per tab component.
