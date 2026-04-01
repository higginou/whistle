import '../styles/components/tab-projection.css'
import { render as renderZoneGroups } from './zone-group.js'
import { get } from '../store.js'

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
  const isDetaille = get('viewMode') === 'detaille'
  const meanConfidence = season.teams.length > 0
    ? Math.round(season.teams.reduce((sum, t) => sum + t.confidence, 0) / season.teams.length * 100)
    : 0

  const progress = document.createElement('div')
  progress.className = 'w-projection-progress'

  if (isDetaille) {
    progress.setAttribute('aria-label', `Journée ${esc(season.matchday)} sur 26, confiance globale ${meanConfidence} pour cent`)
    progress.innerHTML = `
      <span class="w-projection-progress__label">Journée</span>
      <span class="w-projection-progress__value">${esc(season.matchday)} / 26</span>
      <span class="w-projection-progress__sep">·</span>
      <span class="w-projection-progress__label">Confiance</span>
      <span class="w-projection-progress__value">${meanConfidence}%</span>
    `
  } else {
    progress.setAttribute('aria-label', `Journée ${esc(season.matchday)} sur 26`)
    progress.innerHTML = `
      <span class="w-projection-progress__label">Journée</span>
      <span class="w-projection-progress__value">${esc(season.matchday)} / 26</span>
    `
  }

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
