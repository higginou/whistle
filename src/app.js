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
import {
  render as renderBottomSheet,
  open as openBottomSheet,
  close as closeBottomSheet,
} from './components/bottom-sheet.js'
import { render as renderSuccesSheet, open as openSucces, updateBadge } from './components/succes-sheet.js'
import { render as renderProjection } from './components/tab-projection.js'
import { render as renderPlaceholder } from './components/tab-placeholder.js'
import { render as renderDonjon } from './components/tab-donjon.js'
import { render as renderOracle } from './components/tab-oracle.js'
import { render as renderDuels } from './components/tab-duels.js'
import { render as renderSimulateur } from './components/tab-simulateur.js'
import { computeAchievements } from './components/achievement-card.js'
import { revealProjection, resetProjection } from './animation/engine.js'

const appEl = document.querySelector('#app')
const TAB_ORDER = tabIds()

let shell = null
let nav = null
let viewport = null
let prevTabIndex = 0

// Tab view cache: tabId → div element
const tabViews = new Map()

// Restore viewMode from localStorage at boot
const savedMode = localStorage.getItem('w-viewMode')
if (savedMode === 'simple' || savedMode === 'detaille') {
  set('viewMode', savedMode)
}

// Persist viewMode changes to localStorage
on('viewMode', (event) => {
  localStorage.setItem('w-viewMode', event.detail.value)
})

// Invalidate tab cache and re-render active tab when viewMode changes
on('viewMode', () => {
  if (!viewport) return
  const activeTab = get('activeTab')
  tabViews.forEach((view) => { view.remove() })
  tabViews.clear()
  if (activeTab) showTab(activeTab, true)
})

// Invalidate classement cache when simulation mode changes
on('simulationMode', () => {
  if (!viewport) return
  // Remove cached classements view to force re-render
  const classementsView = tabViews.get('classements')
  if (classementsView) {
    classementsView.remove()
    tabViews.delete('classements')
  }
  const activeTab = get('activeTab')
  if (activeTab === 'classements') showTab('classements', true)
})

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Format a delta value for display.
 * @param {number} value — zone probability delta (decimal)
 * @returns {string} e.g. "+12%" or "-3%"
 */
function formatZoneDelta(value) {
  const pct = Math.round(value * 100)
  if (pct === 0) return ''
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

/**
 * Get the most significant zone delta for a team.
 * @param {object} delta
 * @returns {{ zone: string, value: string } | null}
 */
function getMostSignificantDelta(delta) {
  const zones = [
    { zone: 'demi-finales', value: delta.europe },
    { zone: 'top 6', value: delta.top6 },
    { zone: 'maintien', value: delta.relegation },
    { zone: 'ventre mou', value: delta.mid },
  ]
  let best = null
  let bestAbs = 0
  for (const z of zones) {
    const abs = Math.abs(z.value)
    if (abs > bestAbs) {
      bestAbs = abs
      best = z
    }
  }
  if (!best || bestAbs < 0.005) return null
  return { zone: best.zone, value: formatZoneDelta(best.value) }
}

/**
 * Render simulation mode overlay on classement: banner + return button.
 * @param {HTMLElement} standingsSection
 */
function renderSimulationOverlay(standingsSection) {
  // Add simulated class
  standingsSection.classList.add('w-standings-section--simulated')

  // Banner
  const banner = document.createElement('div')
  banner.className = 'w-sim-banner'
  banner.setAttribute('role', 'status')
  banner.setAttribute('aria-live', 'polite')
  banner.innerHTML = '<span class="w-sim-banner__icon" aria-hidden="true">&#9889;</span> Projection simul\u00e9e'
  standingsSection.insertBefore(banner, standingsSection.querySelector('.w-zone-group'))

  // Return button
  const returnBtn = document.createElement('button')
  returnBtn.className = 'w-sim-return-btn'
  returnBtn.setAttribute('aria-label', 'Quitter le mode simul\u00e9 et revenir aux projections r\u00e9elles')
  returnBtn.textContent = 'Revenir au r\u00e9el'
  returnBtn.addEventListener('click', () => {
    set('simulationMode', false)
    set('simulatedStandings', null)
  })
  standingsSection.appendChild(returnBtn)
}

/**
 * Render delta badges on rank-rows in simulation mode.
 * @param {HTMLElement} standingsSection
 * @param {object[]} simulatedTeams
 */
function renderDeltaBadges(standingsSection, simulatedTeams) {
  const teamMap = new Map(simulatedTeams.map((t) => [t.id, t]))
  const rows = standingsSection.querySelectorAll('.w-rank-row')

  for (const row of rows) {
    const teamId = row.dataset.teamId
    const team = teamMap.get(teamId)
    if (!team || !team.delta) continue

    const rankDelta = team.delta.rank
    if (rankDelta !== 0) {
      const badge = document.createElement('span')
      badge.className = `w-delta-badge w-delta-badge--${rankDelta < 0 ? 'up' : 'down'}`
      const sign = rankDelta > 0 ? '+' : ''
      badge.textContent = `${sign}${rankDelta}`
      badge.setAttribute('aria-hidden', 'true')
      const posEl = row.querySelector('.w-rank-row__position')
      if (posEl) posEl.parentNode.insertBefore(badge, posEl.nextSibling)
    }

    const sigDelta = getMostSignificantDelta(team.delta)
    if (sigDelta) {
      const sub = document.createElement('span')
      sub.className = `w-delta-zone w-delta-zone--${sigDelta.value.startsWith('+') ? 'up' : 'down'}`
      sub.textContent = `${sigDelta.zone} ${sigDelta.value}`
      sub.setAttribute('aria-hidden', 'true')
      const info = row.querySelector('.w-rank-row__info')
      if (info) info.appendChild(sub)
    }

    // Descriptive aria-label update
    const rankSign = rankDelta > 0 ? 'plus' : rankDelta < 0 ? 'moins' : ''
    const rankDesc = rankDelta !== 0 ? `${Math.abs(rankDelta)} place${Math.abs(rankDelta) > 1 ? 's' : ''}` : ''
    const sigDesc = sigDelta ? `, ${sigDelta.zone} ${sigDelta.value.replace('+', 'plus ').replace('-', 'moins ')}` : ''
    if (rankDelta !== 0 || sigDelta) {
      const currentLabel = row.getAttribute('aria-label') || ''
      row.setAttribute('aria-label', `${currentLabel}, simulation: ${rankSign} ${rankDesc}${sigDesc}`)
    }
  }
}

function getTabIndex(tabId) {
  return TAB_ORDER.indexOf(tabId)
}

function renderTabContent(tabId, container) {
  const season = get('season')
  switch (tabId) {
    case 'classements': {
      const isSimulated = get('simulationMode')
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
      if (!isSimulated) renderRevealButton(reveal)

      if (isSimulated) {
        const simTeams = get('simulatedStandings')
        if (simTeams && Array.isArray(simTeams)) {
          const sorted = [...simTeams].sort((a, b) => a.currentRank - b.currentRank)
          renderZoneGroups(standings, sorted)
          renderSimulationOverlay(standings)
          renderDeltaBadges(standings, simTeams)
          // Trigger animation after render
          requestAnimationFrame(() => {
            const rows = standings.querySelectorAll('.w-rank-row')
            if (rows.length > 0) {
              resetProjection(rows, sorted)
              revealProjection(rows, simTeams)
            }
          })
        }
      } else if (season && Array.isArray(season.teams)) {
        const sorted = [...season.teams].sort((a, b) => a.currentRank - b.currentRank)
        renderZoneGroups(standings, sorted)
      }
      break
    }
    case 'projection':
      if (season) renderProjection(container, season)
      break
    case 'duels':
      if (season) renderDuels(container, season)
      break
    case 'donjon':
      renderDonjon(container, season)
      break
    case 'oracle':
      if (season) renderOracle(container, season)
      break
    case 'simulateur':
      if (season) renderSimulateur(container, season)
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
  if (!viewport) return
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
