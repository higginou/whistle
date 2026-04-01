import '../styles/components/score-card.css'
import { get, on } from '../store.js'
import { render as renderBadge } from './badge.js'

const FAVORITE_TEAM = 'la-rochelle'
const MAX_UPCOMING = 3
const DIFFICULTY_DOTS = 5

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Extract La Rochelle data from season object.
 * @param {object} season
 * @returns {object|null}
 */
export function extractTeam(season) {
  if (!season || !Array.isArray(season.teams)) return null
  return season.teams.find((t) => t.id === FAVORITE_TEAM) ?? null
}

/**
 * Filter upcoming unplayed matches for La Rochelle (max 3).
 * @param {object[]} calendar
 * @returns {object[]}
 */
export function filterUpcomingMatches(calendar) {
  if (!Array.isArray(calendar)) return []
  return calendar
    .filter(
      (m) =>
        (m.home === FAVORITE_TEAM || m.away === FAVORITE_TEAM) &&
        m.homeScore == null &&
        m.awayScore == null,
    )
    .slice(0, MAX_UPCOMING)
}

/**
 * Convert a decimal probability (0-1) to a display percentage string.
 * @param {number} decimal
 * @returns {string}
 */
export function toPercent(decimal) {
  return `${Math.round(decimal * 100)}%`
}

/**
 * French ordinal suffix for a rank number.
 * @param {number} rank
 * @returns {string}
 */
function ordinal(rank) {
  return rank === 1 ? 'er' : 'e'
}

/**
 * Generate trajectory explanation text from team data.
 * @param {object} team
 * @param {object[]} teamsAll — all teams for opponent name lookup
 * @returns {string}
 */
export function generateExplanation(team, teamsAll) {
  const rank = team.currentRank
  const projected = team.projectedRank
  const elo = team.elo
  const trend = team.trend

  const trendText =
    trend === 'up'
      ? 'en progression'
      : trend === 'down'
        ? 'en recul'
        : 'stable'

  const formStr = Array.isArray(team.form) ? team.form.join('') : ''
  const wins = (formStr.match(/W/g) || []).length
  const losses = (formStr.match(/L/g) || []).length

  let formPhrase = ''
  if (formStr.length > 0) {
    if (wins > losses) formPhrase = 'La dynamique recente est positive.'
    else if (losses > wins) formPhrase = 'La dynamique recente est negative.'
    else formPhrase = 'La dynamique recente est equilibree.'
  }

  const delta = projected - rank
  let projPhrase = ''
  if (delta > 0) projPhrase = `Projection : ${projected}${ordinal(projected)} en fin de saison.`
  else if (delta < 0) projPhrase = `Projection : ${projected}${ordinal(projected)} en fin de saison.`
  else projPhrase = `Projection : maintien au ${projected}${ordinal(projected)} rang.`

  return `${rank}${ordinal(rank)} avec un Elo de ${elo}, le Stade Rochelais est ${trendText}. ${formPhrase} ${projPhrase}`.trim()
}

/**
 * Get trend symbol and label.
 * @param {string} trend
 * @returns {{ symbol: string, label: string }}
 */
function trendDisplay(trend) {
  if (trend === 'up') return { symbol: '\u2191', label: 'Hausse' }
  if (trend === 'down') return { symbol: '\u2193', label: 'Baisse' }
  return { symbol: '=', label: 'Stable' }
}

/**
 * Build difficulty dots HTML.
 * @param {number} difficulty — decimal 0-1
 * @returns {string}
 */
function difficultyDots(difficulty) {
  const active = Math.round(difficulty * DIFFICULTY_DOTS)
  return Array.from({ length: DIFFICULTY_DOTS }, (_, i) =>
    `<span${i < active ? ' class="active"' : ''}></span>`,
  ).join('')
}

/**
 * Look up a team name by id.
 * @param {string} id
 * @param {object[]} teams
 * @returns {string}
 */
function teamName(id, teams) {
  const t = teams.find((team) => team.id === id)
  return t ? t.name : id
}

/**
 * Build the score card HTML.
 * @param {object} team
 * @param {object} season
 * @returns {string}
 */
function buildHTML(team, season) {
  const isDetaille = get('viewMode') === 'detaille'
  const { symbol, label } = trendDisplay(team.trend)
  const top6Pct = Math.round(team.zones.top6 * 100)
  const matches = filterUpcomingMatches(season.calendar)
  const explanation = generateExplanation(team, season.teams)

  const matchPills = matches.map((m) => {
    const isHome = m.home === FAVORITE_TEAM
    const opponentId = isHome ? m.away : m.home
    const opponentName = teamName(opponentId, season.teams)
    const venue = isHome ? 'Domicile' : 'Exterieur'
    return `
      <div class="w-match-pill">
        <span class="w-match-pill__name">${esc(opponentName)}</span>
        <span class="w-match-pill__detail">${venue}</span>
        <div class="w-match-pill__difficulty">${difficultyDots(m.difficulty ?? 0.5)}</div>
      </div>`
  }).join('')

  return `
    <div class="w-score-card__header">
      <h1 class="w-score-card__team-name">Stade Rochelais</h1>
    </div>

    <div class="w-score-card__grid">
      <div class="w-mini-card w-mini-card--position w-mini-card--full">
        <div class="w-mini-card__position-group">
          <span class="w-mini-card__pos-label">Actuel</span>
          <span class="w-mini-card__pos-num">${team.currentRank}<sup>${ordinal(team.currentRank)}</sup></span>
        </div>
        <span class="w-mini-card__arrow" aria-hidden="true">&#10132;</span>
        <div class="w-mini-card__position-group">
          <span class="w-mini-card__pos-label">Projete</span>
          <span class="w-mini-card__pos-num" style="opacity:0.7">${team.projectedRank}<sup>${ordinal(team.projectedRank)}</sup></span>
        </div>
      </div>

      <div class="w-mini-card w-mini-card--tendance">
        <span class="w-mini-card__label">Tendance</span>
        <span class="w-mini-card__value w-mini-card__value--medium">
          <span class="w-mini-card__trend-symbol">${symbol}</span> ${label}
        </span>
      </div>

      ${isDetaille ? `<div class="w-mini-card">
        <span class="w-mini-card__label">Elo</span>
        <span class="w-mini-card__value w-mini-card__value--medium w-tabular">${team.elo}</span>
        <span class="w-mini-card__confidence">Confiance ${toPercent(team.confidence)}</span>
      </div>` : ''}

      <div class="w-mini-card w-mini-card--xp w-mini-card--full"
           role="button"
           tabindex="0"
           aria-label="Probabilite top 6 : ${top6Pct}%. Appuyer pour voir le detail par zone.">
        <span class="w-mini-card__label">Probabilite Top 6</span>
        <div class="w-mini-card__xp-row">
          <div class="w-mini-card__xp-bar" role="progressbar" aria-valuenow="${top6Pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="w-mini-card__xp-fill" style="width: ${top6Pct}%;"></div>
          </div>
          <span class="w-mini-card__xp-pct">${top6Pct}%</span>
        </div>
        <div class="w-mini-card__zones">
          <span class="w-mini-card__zone"><span class="w-mini-card__zone-dot" style="background:var(--w-color-europe)"></span> Demi-finales ${toPercent(team.zones.europe)}</span>
          <span class="w-mini-card__zone"><span class="w-mini-card__zone-dot" style="background:var(--w-color-top6)"></span> Phases finales ${toPercent(team.zones.top6)}</span>
          <span class="w-mini-card__zone"><span class="w-mini-card__zone-dot" style="background:var(--w-color-mid)"></span> Milieu ${toPercent(team.zones.mid)}</span>
          <span class="w-mini-card__zone"><span class="w-mini-card__zone-dot" style="background:var(--w-color-relegation)"></span> Releg. ${toPercent(team.zones.relegation)}</span>
        </div>
      </div>

      <div class="w-mini-card w-mini-card--matches w-mini-card--full">
        <span class="w-mini-card__label">Prochains matchs</span>
        <div class="w-mini-card__match-row">${matchPills}</div>
      </div>

      <div class="w-mini-card w-mini-card--explication w-mini-card--full">
        <span class="w-mini-card__label"><span class="w-mini-card__explication-icon">&#9881;</span> Analyse du modele</span>
        <p class="w-mini-card__explication-text">${esc(explanation)}</p>
      </div>
    </div>`
}

/**
 * Toggle zone detail visibility on XP card.
 * @param {Event} event
 */
function handleXpToggle(event) {
  const card = event.currentTarget
  const zones = card.querySelector('.w-mini-card__zones')
  if (zones) zones.classList.toggle('is-open')
}

/**
 * Format an ISO date to French readable format.
 * @param {string} isoDate
 * @returns {string}
 */
function formatDateFr(isoDate) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

export function render(container) {
  const article = document.createElement('article')
  article.className = 'w-score-card'
  article.setAttribute('aria-label', 'Fiche La Rochelle')
  container.appendChild(article)

  // Persistent badge slot — survives innerHTML re-renders
  const badgeSlot = document.createElement('span')
  badgeSlot.className = 'w-score-card__badge-slot'

  // Stale indicator — persistent, below the card
  const staleEl = document.createElement('div')
  staleEl.className = 'w-stale-indicator'
  staleEl.hidden = true
  container.appendChild(staleEl)

  function update() {
    const season = get('season')
    if (!season) return

    const team = extractTeam(season)
    if (!team) return

    article.innerHTML = buildHTML(team, season)

    // Re-attach persistent badge slot into the header
    const header = article.querySelector('.w-score-card__header')
    if (header) header.appendChild(badgeSlot)

    // Bind XP card toggle
    const xpCard = article.querySelector('.w-mini-card--xp')
    if (xpCard) {
      xpCard.addEventListener('click', handleXpToggle)
      xpCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleXpToggle(e)
        }
      })
    }
  }

  // Show stale indicator when data is old
  on('dataStale', (event) => {
    const { value } = event.detail
    if (value) {
      staleEl.hidden = false
      staleEl.innerHTML = `
        <svg class="w-stale-indicator__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Derniere mise a jour : ${esc(formatDateFr(value))}
      `
    } else {
      staleEl.hidden = true
    }
  })

  // Initial render if data already present
  update()
  renderBadge(badgeSlot)

  // Listen for future updates
  on('season', update)
}
