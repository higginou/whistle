/** @module bottom-sheet — Team detail dialog (gaming variant B2) */

import '../styles/components/bottom-sheet.css'

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

const DIFFICULTY_DOTS = 5
const MAX_UPCOMING = 5
const CLOSE_TIMEOUT = 250

/** Elo tier thresholds */
const ELO_MIN = 1350
const ELO_MAX = 1700

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
 * French ordinal suffix.
 * @param {number} rank
 * @returns {string}
 */
function ordinal(rank) {
  return rank === 1 ? 'er' : 'e'
}

/**
 * Compute an Elo-based tier label and bar fill percentage.
 * @param {number} elo
 * @returns {{ label: string, pct: number }}
 */
export function computeTier(elo) {
  const pct = Math.max(0, Math.min(100, Math.round(((elo - ELO_MIN) / (ELO_MAX - ELO_MIN)) * 100)))
  let label = 'Recrue'
  if (pct >= 80) label = 'Elite'
  else if (pct >= 60) label = 'Veteran'
  else if (pct >= 40) label = 'Titulaire'
  else if (pct >= 20) label = 'Espoir'
  return { label, pct }
}

/**
 * Filter upcoming unplayed matches for a specific team.
 * @param {object[]} calendar
 * @param {string} teamId
 * @returns {object[]}
 */
export function filterUpcomingForTeam(calendar, teamId) {
  if (!Array.isArray(calendar)) return []
  return calendar
    .filter(
      (m) =>
        (m.home === teamId || m.away === teamId) &&
        m.homeScore == null &&
        m.awayScore == null,
    )
    .slice(0, MAX_UPCOMING)
}

/**
 * Get trend info for progression display.
 * @param {number} current
 * @param {number} projected
 * @returns {{ cls: string, arrowLabel: string }}
 */
function getProgression(current, projected) {
  const delta = current - projected // lower rank = better, so positive delta = improvement
  if (delta > 0) return { cls: 'up', arrowLabel: `\u2191 +${delta}` }
  if (delta < 0) return { cls: 'down', arrowLabel: `\u2193 ${delta}` }
  return { cls: 'stable', arrowLabel: '= 0' }
}

/**
 * Get streak text from form and trend.
 * @param {string[]} form
 * @param {string} trend
 * @returns {{ text: string, cls: string }}
 */
function getStreak(form, trend) {
  if (!Array.isArray(form) || form.length === 0) return { text: '', cls: 'stable' }
  const wins = form.filter((r) => r === 'W').length
  const losses = form.filter((r) => r === 'L').length
  if (trend === 'up' || wins > losses) return { text: 'Tendance haussiere', cls: 'up' }
  if (trend === 'down' || losses > wins) return { text: 'Tendance baissiere', cls: 'down' }
  return { text: 'Tendance stable', cls: 'stable' }
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

/* ===== Module state ===== */
let dialog = null
let isClosing = false

/**
 * Build the full dialog HTML content for a team.
 * @param {object} team
 * @param {object} season
 * @returns {string}
 */
function buildContent(team, season) {
  const initials = getInitials(team.name)
  const bgColor = TEAM_COLORS[team.id] ?? '#6b7280'
  const tier = computeTier(team.elo)
  const prog = getProgression(team.currentRank, team.projectedRank)
  const confidencePct = Math.round(team.confidence * 100)
  const streak = getStreak(team.form, team.trend)
  const matches = filterUpcomingForTeam(season.calendar, team.id)

  // Form dots
  const formDots = Array.isArray(team.form)
    ? team.form
        .slice(-5)
        .map((r) => {
          const cls = r === 'W' ? 'W' : r === 'L' ? 'L' : 'D'
          const label = r === 'W' ? 'Victoire' : r === 'L' ? 'Defaite' : 'Nul'
          const letter = r === 'W' ? 'V' : r === 'L' ? 'D' : 'N'
          return `<span class="w-sheet-form__dot w-sheet-form__dot--${cls}" aria-label="${label}">${letter}</span>`
        })
        .join('')
    : ''

  // Zone cards
  const zones = [
    { key: 'europe', cls: 'europe', name: 'Demi-finales', subtitle: 'Acces direct' },
    { key: 'top6', cls: 'top6', name: 'Top 6', subtitle: 'Phases finales' },
    { key: 'mid', cls: 'mid', name: 'Milieu', subtitle: 'Milieu de tableau' },
    { key: 'relegation', cls: 'relegation', name: 'Relegation', subtitle: 'Zone rouge' },
  ]

  const zoneCards = zones
    .map((z) => {
      const pct = Math.round((team.zones[z.key] ?? 0) * 100)
      return `
      <div class="w-zone-card w-zone-card--${z.cls}" aria-label="${z.name} : ${pct}%">
        <div class="w-zone-card__info">
          <span class="w-zone-card__name">${z.name}</span>
          <span class="w-zone-card__subtitle">${z.subtitle}</span>
        </div>
        <span class="w-zone-card__pct">${pct}<span class="w-zone-card__pct-symbol">%</span></span>
      </div>`
    })
    .join('')

  // Calendar matches
  const calendarHTML = matches.length > 0
    ? matches
        .map((m) => {
          const isHome = m.home === team.id
          const opponentId = isHome ? m.away : m.home
          const opponentName = teamName(opponentId, season.teams)
          const venue = isHome ? 'Domicile' : 'Exterieur'
          const activeDots = Math.round((m.difficulty ?? 0.5) * DIFFICULTY_DOTS)
          const dots = Array.from({ length: DIFFICULTY_DOTS }, (_, i) =>
            `<span class="w-sheet-calendar__difficulty-dot${i < activeDots ? ' w-sheet-calendar__difficulty-dot--active' : ''}"></span>`,
          ).join('')
          return `
          <div class="w-sheet-calendar__match">
            <div>
              <div class="w-sheet-calendar__opponent">${opponentName}</div>
              <div class="w-sheet-calendar__venue">${venue}</div>
            </div>
            <div class="w-sheet-calendar__difficulty">${dots}</div>
          </div>`
        })
        .join('')
    : '<div class="w-sheet-calendar__match"><div class="w-sheet-calendar__opponent" style="color:#6b7280">Aucun match a venir</div></div>'

  // Streak display
  const streakHTML = streak.text
    ? `<div class="w-sheet-form__streak w-sheet-form__streak--${streak.cls}" aria-label="Tendance ${streak.cls === 'up' ? 'positive' : streak.cls === 'down' ? 'negative' : 'neutre'}">${streak.text}</div>`
    : ''

  return `
    <div class="w-bottom-sheet__bg" aria-hidden="true"></div>
    <div class="w-hud-corner w-hud-corner--tl" aria-hidden="true"></div>
    <div class="w-hud-corner w-hud-corner--tr" aria-hidden="true"></div>
    <div class="w-hud-corner w-hud-corner--bl" aria-hidden="true"></div>
    <div class="w-hud-corner w-hud-corner--br" aria-hidden="true"></div>
    <div class="w-bottom-sheet__handle" aria-hidden="true"></div>
    <button class="w-bottom-sheet__close" aria-label="Fermer">\u00D7</button>
    <div class="w-bottom-sheet__content">
      <div class="w-sheet-hero">
        <div class="w-sheet-hero__logo" aria-hidden="true" style="background:${bgColor}">${initials}</div>
        <div class="w-sheet-hero__name">${team.name}</div>
        <div class="w-sheet-hero__elo">Elo <strong>${team.elo}</strong></div>
        <div class="w-sheet-tier" aria-label="Niveau de force : ${tier.label}">
          <span class="w-sheet-tier__label">${tier.label}</span>
          <div class="w-sheet-tier__bar" role="meter" aria-valuenow="${tier.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Puissance ${tier.pct}%">
            <div class="w-sheet-tier__bar-fill" style="width:${tier.pct}%"></div>
          </div>
        </div>
      </div>

      <div class="w-sheet-progression">
        <div class="w-sheet-progression__rank">
          <span class="w-sheet-progression__rank-label">Actuel</span>
          <span class="w-sheet-progression__rank-num">${team.currentRank}<sup>${ordinal(team.currentRank)}</sup></span>
        </div>
        <div class="w-sheet-progression__arrow w-sheet-progression__arrow--${prog.cls}">
          <div class="w-sheet-progression__arrow-line"></div>
          <span class="w-sheet-progression__arrow-label">${prog.arrowLabel}</span>
        </div>
        <div class="w-sheet-progression__rank">
          <span class="w-sheet-progression__rank-label">Projete</span>
          <span class="w-sheet-progression__rank-num w-sheet-progression__rank-num--${prog.cls}">${team.projectedRank}<sup>${ordinal(team.projectedRank)}</sup></span>
        </div>
        <div class="w-sheet-progression__confidence">
          <span class="w-sheet-progression__confidence-value">${confidencePct}%</span>
          <span class="w-sheet-progression__confidence-label">Confiance</span>
        </div>
      </div>

      <p class="w-section-title">Probabilites par zone</p>
      <div class="w-sheet-zones" aria-label="Probabilites par zone">
        ${zoneCards}
      </div>

      <div class="w-sheet-form" aria-label="Forme recente">
        <p class="w-section-title">Forme recente</p>
        <div class="w-sheet-form__dots">${formDots}</div>
        ${streakHTML}
      </div>

      <div class="w-sheet-calendar" aria-label="Prochains matchs">
        <p class="w-section-title">Prochains matchs</p>
        <div class="w-sheet-calendar__list">${calendarHTML}</div>
      </div>
    </div>`
}

/**
 * Create the dialog element and insert it into the container.
 * Call once at startup.
 * @param {HTMLElement} container
 */
function render(container) {
  dialog = document.createElement('dialog')
  dialog.className = 'w-bottom-sheet'
  dialog.setAttribute('aria-modal', 'true')
  container.appendChild(dialog)

  // Close on backdrop click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close()
  })

  // Prevent ESC default, animate close instead
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault()
    close()
  })
}

/**
 * Open the bottom sheet for a specific team.
 * @param {object} team
 * @param {object} season
 */
function open(team, season) {
  if (!dialog) return
  if (dialog.open) {
    // Already open — just replace content
    dialog.innerHTML = buildContent(team, season)
    dialog.setAttribute('aria-label', `Fiche equipe ${team.name}`)
    bindInternalEvents()
    return
  }

  dialog.innerHTML = buildContent(team, season)
  dialog.setAttribute('aria-label', `Fiche equipe ${team.name}`)
  dialog.classList.remove('w-bottom-sheet--closing')
  dialog.showModal()
  bindInternalEvents()
}

/**
 * Close the bottom sheet with animation.
 */
function close() {
  if (!dialog || !dialog.open || isClosing) return
  isClosing = true

  dialog.classList.add('w-bottom-sheet--closing')

  const fallback = setTimeout(finishClose, CLOSE_TIMEOUT)

  dialog.addEventListener(
    'transitionend',
    function handler() {
      clearTimeout(fallback)
      dialog.removeEventListener('transitionend', handler)
      finishClose()
    },
    { once: true },
  )
}

function finishClose() {
  if (!dialog || !isClosing) return
  isClosing = false
  dialog.classList.remove('w-bottom-sheet--closing')
  if (dialog.open) dialog.close()
}

/**
 * Bind close button and drag events after innerHTML is set.
 */
function bindInternalEvents() {
  const closeBtn = dialog.querySelector('.w-bottom-sheet__close')
  if (closeBtn) closeBtn.addEventListener('click', close)

  const handle = dialog.querySelector('.w-bottom-sheet__handle')
  if (handle) bindDrag(handle)
}

/**
 * Bind touch drag to the handle.
 * @param {HTMLElement} handle
 */
function bindDrag(handle) {
  let startY = 0
  let currentDelta = 0
  let isDragging = false

  handle.addEventListener(
    'touchstart',
    (e) => {
      isDragging = true
      startY = e.touches[0].clientY
      currentDelta = 0
      dialog.style.transition = 'none'
    },
    { passive: false },
  )

  handle.addEventListener(
    'touchmove',
    (e) => {
      if (!isDragging) return
      e.preventDefault()
      const delta = e.touches[0].clientY - startY
      if (delta > 0) {
        currentDelta = delta
        dialog.style.transform = `translateY(${delta}px)`
      }
    },
    { passive: false },
  )

  handle.addEventListener('touchend', () => {
    if (!isDragging) return
    isDragging = false
    dialog.style.transition = ''
    dialog.style.transform = ''
    if (currentDelta > 120) {
      close()
    }
  })
}

export { render, open, close, buildContent }
