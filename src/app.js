import './styles/base.css'
import { on } from './store.js'
import { loadSeason } from './data.js'
import { init as initRouter } from './router.js'

document.querySelector('#app').innerHTML = '<h1>Whistle</h1>'

on('season', (event) => {
  const { value } = event.detail
  if (value) {
    console.log('[Whistle] Season loaded:', value.id ?? 'unknown')
  } else {
    console.log('[Whistle] No season data available')
  }
})

initRouter()
loadSeason()
