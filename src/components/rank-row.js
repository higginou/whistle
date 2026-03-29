import '../styles/components/rank-row.css'
import { render as renderConfidenceBar } from './confidence-bar.js'
import { set } from '../store.js'
import { pushSheet } from '../router.js'

const FAVORITE_TEAM = 'la-rochelle'

/** @type {Record<string, string>} team id to brand color for logo placeholder */
const TEAM_COLORS = {
  toulouse: '#c41e3a',
  'bordeaux-begles': '#5a2d82',
  'la-rochelle': '#ffd700',
  toulon: '#cc0000',
  'racing-92': '#1e3a5f',
  castres: '#003da5',
  clermont: '#ffe100',
  lyon: '#e30613',
  pau: '#006a4e',
  montpellier: '#003da5',
  'stade-francais': '#ff69b4',
  perpignan: '#8b0000',
  bayonne: '#003da5',
  vannes: '#e30613',
}

/**
 * Get 1-2 letter initials from a team name.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * French trend label for aria.
 * @param {string} trend
 * @returns {string}
 */
function getTrendLabel(trend) {
  if (trend === 'up') return 'en hausse'
  if (trend === 'down') return 'en baisse'
  return 'stable'
}

/**
 * Get delta display info from trend.
 * @param {string} trend
 * @returns {{ text: string, cls: string }}
 */
function getDeltaDisplay(trend) {
  if (trend === 'up') return { text: '\u2191', cls: 'up' }
  if (trend === 'down') return { text: '\u2193', cls: 'down' }
  return { text: '=', cls: 'stable' }
}

/**
 * French ordinal suffix.
 * @param {number} rank
 * @returns {string}
 */
function ordinalSuffix(rank) {
  return rank === 1 ? 'er' : 'eme'
}

/**
 * Get confidence level label in French.
 * @param {number} confidence
 * @returns {string}
 */
function getConfidenceLabel(confidence) {
  if (confidence > 0.7) return 'elevee'
  if (confidence >= 0.4) return 'moyenne'
  return 'basse'
}

/**
 * Render a single team row into the given list element.
 * @param {HTMLElement} listElement — the <ul> to append to
 * @param {object} team — team data with id, name, currentRank, elo, confidence, trend
 * @returns {HTMLLIElement}
 */
export function render(listElement, team) {
  const isFavorite = team.id === FAVORITE_TEAM
  const delta = getDeltaDisplay(team.trend)
  const trendLabel = getTrendLabel(team.trend)
  const confLabel = getConfidenceLabel(team.confidence)
  const rank = team.currentRank

  const li = document.createElement('li')

  const row = document.createElement('div')
  row.className = `w-rank-row${isFavorite ? ' w-rank-row--favorite' : ''}`
  row.dataset.teamId = team.id
  row.setAttribute('role', 'button')
  row.setAttribute('tabindex', '0')
  row.setAttribute(
    'aria-label',
    `${rank}${ordinalSuffix(rank)}, ${team.name}, Elo ${team.elo}, ${trendLabel}, confiance ${confLabel}`,
  )

  // Tap handler — open team detail bottom sheet
  row.addEventListener('click', () => {
    set('selectedTeam', team.id)
    pushSheet('team-detail')
  })

  // Keyboard support
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      set('selectedTeam', team.id)
      pushSheet('team-detail')
    }
  })

  // Tactile feedback (scale 0.97)
  row.addEventListener('pointerdown', () => row.classList.add('is-pressed'))
  row.addEventListener('pointerup', () => row.classList.remove('is-pressed'))
  row.addEventListener('pointerleave', () => row.classList.remove('is-pressed'))
  row.addEventListener('pointercancel', () => row.classList.remove('is-pressed'))

  // Position
  const position = document.createElement('span')
  position.className = 'w-rank-row__position'
  position.textContent = String(rank)
  row.appendChild(position)

  // Logo placeholder (initials in colored circle)
  const logo = document.createElement('span')
  logo.className = 'w-rank-row__logo'
  logo.style.background = TEAM_COLORS[team.id] ?? '#6b7280'
  logo.textContent = getInitials(team.name)
  logo.setAttribute('aria-hidden', 'true')
  row.appendChild(logo)

  // Info block (name + elo)
  const info = document.createElement('div')
  info.className = 'w-rank-row__info'

  const nameSpan = document.createElement('span')
  nameSpan.className = 'w-rank-row__name'
  nameSpan.textContent = team.name
  info.appendChild(nameSpan)

  const eloSpan = document.createElement('span')
  eloSpan.className = 'w-rank-row__elo'
  eloSpan.textContent = `Elo ${team.elo}`
  info.appendChild(eloSpan)

  row.appendChild(info)

  // Delta (trend arrow)
  const deltaSpan = document.createElement('span')
  deltaSpan.className = `w-rank-row__delta w-rank-row__delta--${delta.cls}`
  deltaSpan.textContent = delta.text
  deltaSpan.setAttribute('aria-hidden', 'true')
  row.appendChild(deltaSpan)

  // Confidence bar
  renderConfidenceBar(row, team.confidence)

  li.appendChild(row)
  listElement.appendChild(li)

  return li
}
