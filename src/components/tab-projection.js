import '../styles/components/tab-projection.css'
import { render as renderZoneGroups } from './zone-group.js'
import { get } from '../store.js'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Enrich existing pills on rank-rows with numeric rank delta.
 * @param {HTMLElement} container
 * @param {object[]} teams — with rankDelta computed
 */
function renderMovementBadges(container, teams) {
  const rows = container.querySelectorAll('.w-rank-row')
  for (const row of rows) {
    const teamId = row.dataset.teamId
    const team = teams.find((t) => t.id === teamId)
    if (!team) continue

    const pill = row.querySelector('.w-rank-row__pill')
    if (!pill || team.rankDelta === 0) continue

    // Append numeric delta text
    const deltaText = team.rankDelta > 0 ? `+${team.rankDelta}` : String(team.rankDelta)
    pill.appendChild(document.createTextNode(deltaText))

    // Update pill modifier if delta direction differs from trend
    const deltaCls = team.rankDelta > 0 ? 'up' : 'down'
    if (!pill.classList.contains(`w-rank-row__pill--${deltaCls}`)) {
      pill.classList.remove('w-rank-row__pill--up', 'w-rank-row__pill--down', 'w-rank-row__pill--stable')
      pill.classList.add(`w-rank-row__pill--${deltaCls}`)
    }

    // Update aria-label with rank delta info
    pill.setAttribute('aria-label',
      `${Math.abs(team.rankDelta)} place${Math.abs(team.rankDelta) > 1 ? 's' : ''} ${team.rankDelta > 0 ? 'en hausse' : 'en baisse'}`)
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
    .sort((a, b) => {
      const pa = a.projectedPoints ?? a.points
      const pb = b.projectedPoints ?? b.points
      return pa !== pb ? pb - pa : a.projectedRank - b.projectedRank
    })

  // Assign competition-style display ranks (shared rank when points are equal)
  for (let i = 0; i < sorted.length; i++) {
    const pts = sorted[i].projectedPoints ?? sorted[i].points
    const prevPts = i > 0 ? (sorted[i - 1].projectedPoints ?? sorted[i - 1].points) : null
    sorted[i] = {
      ...sorted[i],
      points: pts,
      currentRank: pts === prevPts ? sorted[i - 1].currentRank : i + 1,
      rankDelta: sorted[i].currentRank - (pts === prevPts ? sorted[i - 1].currentRank : i + 1),
    }
  }
  renderZoneGroups(standingsEl, sorted)
  renderMovementBadges(standingsEl, sorted)

  container.appendChild(progress)
  container.appendChild(standingsEl)
}
