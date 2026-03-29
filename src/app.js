import './styles/base.css'
import { on } from './store.js'
import { loadSeason } from './data.js'
import { init as initRouter } from './router.js'
import { render as renderLayout } from './components/page-layout.js'
import { render as renderScoreCard } from './components/score-card.js'

const appEl = document.querySelector('#app')

// Create layout once at startup
const layout = renderLayout()
appEl.replaceChildren(layout)

const heroSection = layout.querySelector('.w-hero-section')
if (heroSection) renderScoreCard(heroSection)

// Handle empty state when season fetch returns null
on('season', (event) => {
  const { value } = event.detail
  if (value) {
    console.log('[Whistle] Season loaded:', value.id ?? 'unknown')
  } else {
    console.log('[Whistle] No season data available')
    appEl.innerHTML = '<p class="w-empty-state">Les donnees arrivent lundi</p>'
  }
})

initRouter()
loadSeason()
