import './styles/base.css'
import { on } from './store.js'
import { loadSeason } from './data.js'
import { init as initRouter } from './router.js'
import { render as renderLayout } from './components/page-layout.js'
import { render as renderScoreCard } from './components/score-card.js'
import { render as renderZoneGroups } from './components/zone-group.js'
import { render as renderRevealButton } from './components/reveal-button.js'
import { render as renderAchievements } from './components/achievement-card.js'

const appEl = document.querySelector('#app')

// Create layout once at startup
const layout = renderLayout()
appEl.replaceChildren(layout)

const heroSection = layout.querySelector('.w-hero-section')
if (heroSection) renderScoreCard(heroSection)

const revealSection = layout.querySelector('.w-reveal-section')
if (revealSection) renderRevealButton(revealSection)

const achievementsSection = layout.querySelector('.w-achievements-section')
const standingsSection = layout.querySelector('.w-standings-section')

// Handle empty state when season fetch returns null
on('season', (event) => {
  const { value } = event.detail
  if (value) {
    console.log('[Whistle] Season loaded:', value.id ?? 'unknown')

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
    if (standingsSection) {
      standingsSection.innerHTML =
        '<p class="w-empty-state">Les donnees arrivent lundi</p>'
    }
  }
})

initRouter()
loadSeason()
