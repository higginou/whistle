import './styles/base.css'
import { on } from './store.js'
import { loadSeason } from './data.js'
import { init as initRouter } from './router.js'
import { render as renderLayout } from './components/page-layout.js'

const appEl = document.querySelector('#app')

on('season', (event) => {
  const { value } = event.detail
  if (value) {
    console.log('[Whistle] Season loaded:', value.id ?? 'unknown')
    appEl.replaceChildren(renderLayout())
  } else {
    console.log('[Whistle] No season data available')
    appEl.innerHTML = '<p class="w-empty-state">Les donnees arrivent lundi</p>'
  }
})

initRouter()
loadSeason()
