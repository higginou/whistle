import '../styles/components/tab-projection.css'
import { render as renderZoneGroups } from './zone-group.js'
import { get } from '../store.js'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Inject movement badges on rank-rows showing rank delta.
 * @param {HTMLElement} container
 * @param {object[]} teams — with rankDelta computed
 */
function renderMovementBadges(container, teams) {
  const rows = container.querySelectorAll('.w-rank-row')
  for (const row of rows) {
    const teamId = row.dataset.teamId
    const team = teams.find((t) => t.id === teamId)
    if (!team || team.rankDelta === 0) continue

    const badge = document.createElement('span')
    badge.className = `w-rank-delta w-rank-delta--${team.rankDelta > 0 ? 'up' : 'down'}`
    badge.textContent = team.rankDelta > 0 ? `+${team.rankDelta}` : String(team.rankDelta)
    badge.setAttribute('aria-label',
      `${Math.abs(team.rankDelta)} place${Math.abs(team.rankDelta) > 1 ? 's' : ''} ${team.rankDelta > 0 ? 'en hausse' : 'en baisse'}`)

    const posEl = row.querySelector('.w-rank-row__position')
    if (posEl) posEl.parentNode.insertBefore(badge, posEl.nextSibling)
  }
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
    progress.setAttribute('aria-label', `Projection journée 26, basée sur journée ${esc(season.matchday)}, confiance globale ${meanConfidence} pour cent`)
    progress.innerHTML = `
      <span class="w-projection-progress__label">Projection</span>
      <span class="w-projection-progress__value">J-26</span>
      <span class="w-projection-progress__sep">·</span>
      <span class="w-projection-progress__label">Basée sur</span>
      <span class="w-projection-progress__value">J-${esc(season.matchday)}</span>
      <span class="w-projection-progress__sep">·</span>
      <span class="w-projection-progress__label">Confiance</span>
      <span class="w-projection-progress__value">${meanConfidence}%</span>
    `
  } else {
    progress.setAttribute('aria-label', `Projection journée 26, basée sur journée ${esc(season.matchday)}`)
    progress.innerHTML = `
      <span class="w-projection-progress__label">Projection</span>
      <span class="w-projection-progress__value">J-26</span>
      <span class="w-projection-progress__sep">·</span>
      <span class="w-projection-progress__label">Basée sur</span>
      <span class="w-projection-progress__value">J-${esc(season.matchday)}</span>
    `
  }

  const standingsEl = document.createElement('div')
  standingsEl.className = 'w-projection-standings'

  const sorted = [...season.teams]
    .sort((a, b) => a.projectedRank - b.projectedRank)
    .map((t) => ({
      ...t,
      currentRank: t.projectedRank,
      points: t.projectedPoints ?? t.points,
      rankDelta: t.currentRank - t.projectedRank,
    }))
  renderZoneGroups(standingsEl, sorted)
  renderMovementBadges(standingsEl, sorted)

  container.appendChild(progress)
  container.appendChild(standingsEl)
}
