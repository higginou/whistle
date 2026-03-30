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
      if (season) renderOracle(container, season)
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
