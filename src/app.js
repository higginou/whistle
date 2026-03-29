import './styles/base.css'
import { registerSW } from 'virtual:pwa-register'
import { get, set, on } from './store.js'
import { loadSeason } from './data.js'
import { init as initRouter } from './router.js'
import { render as renderLayout } from './components/page-layout.js'
import { render as renderScoreCard } from './components/score-card.js'
import { render as renderZoneGroups } from './components/zone-group.js'
import { render as renderRevealButton } from './components/reveal-button.js'
import { render as renderAchievements } from './components/achievement-card.js'
import { render as renderEmptyState } from './components/empty-state.js'
import {
  render as renderBottomSheet,
  open as openBottomSheet,
  close as closeBottomSheet,
} from './components/bottom-sheet.js'

const appEl = document.querySelector('#app')
let layoutRendered = false

function renderFullLayout() {
  if (layoutRendered) return
  layoutRendered = true

  const layout = renderLayout()
  appEl.replaceChildren(layout)

  const heroSection = layout.querySelector('.w-hero-section')
  if (heroSection) renderScoreCard(heroSection)

  const revealSection = layout.querySelector('.w-reveal-section')
  if (revealSection) renderRevealButton(revealSection)

  // Bottom sheet — created once on body (top-level for showModal)
  renderBottomSheet(document.body)
}

// Handle season data or empty state
on('season', (event) => {
  const { value } = event.detail
  if (value) {
    renderFullLayout()
    console.log('[Whistle] Season loaded:', value.id ?? 'unknown')

    const achievementsSection = appEl.querySelector('.w-achievements-section')
    const standingsSection = appEl.querySelector('.w-standings-section')

    // Render achievement cards
    if (achievementsSection) renderAchievements(achievementsSection, value)

    // Render standings grouped by zones
    if (standingsSection && Array.isArray(value.teams)) {
      const sorted = [...value.teams].sort(
        (a, b) => a.currentRank - b.currentRank,
      )
      renderZoneGroups(standingsSection, sorted)
    }
  } else {
    console.log('[Whistle] No season data available')
    renderEmptyState(appEl)
  }
})

// Open bottom sheet when a team is selected
on('selectedTeam', (event) => {
  const { value: teamId } = event.detail
  if (!teamId) return
  const activeSheet = get('activeSheet')
  if (activeSheet !== 'team-detail') return

  const season = get('season')
  if (!season || !Array.isArray(season.teams)) return

  const team = season.teams.find((t) => t.id === teamId)
  if (team) openBottomSheet(team, season)
})

// Close bottom sheet when activeSheet is cleared (back button / popstate)
on('activeSheet', (event) => {
  const { value } = event.detail
  if (value === null) {
    set('selectedTeam', null)
    closeBottomSheet()
  }
})

// Register Service Worker (autoUpdate — silent, no user prompt)
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('[SW] Offline ready')
  },
  onRegisteredSW(swUrl, registration) {
    // Periodic check for new SW (every hour)
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onRegisterError(error) {
    console.error('[SW] Registration failed:', error)
  },
})

initRouter()
loadSeason()
