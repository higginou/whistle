import '../styles/components/tab-simulateur.css'
import { get, set, on } from '../store.js'
import { recalculateProjections, matchKey } from '../simulator-engine.js'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const FAVORITE_TEAM = 'la-rochelle'

/**
 * Build a short abbreviation from a team ID for circle display.
 * Single-part IDs → first 3 chars uppercase.
 * Multi-part IDs → first letter of each word (numbers kept whole), up to 4 chars.
 * @param {string} teamId
 * @returns {string}
 */
export function getInitials(teamId) {
  const parts = teamId.split('-')
  if (parts.length === 1) return teamId.slice(0, 3).toUpperCase()
  return parts.map((p) => /^\d+$/.test(p) ? p : p[0]).join('').toUpperCase().slice(0, 4)
}

// matchKey imported from simulator-engine.js (single source of truth)
export { matchKey } from '../simulator-engine.js'

/**
 * Filter upcoming matches from calendar.
 * A match is upcoming if homeScore is absent or null.
 * @param {object[]} calendar
 * @returns {object[]}
 */
export function filterUpcoming(calendar) {
  if (!Array.isArray(calendar)) return []
  return calendar.filter((m) => m.homeScore == null)
}

/**
 * Get difficulty color CSS variable name based on difficulty value.
 * @param {number} diff
 * @returns {string}
 */
function diffColor(diff) {
  if (diff >= 0.7) return 'var(--w-red)'
  if (diff >= 0.5) return 'var(--w-orange)'
  return 'var(--w-green)'
}

/**
 * Group upcoming matches by matchday.
 * @param {object[]} matches
 * @returns {Map<number, object[]>}
 */
function groupByMatchday(matches) {
  const groups = new Map()
  for (const m of matches) {
    const md = m.matchday
    if (!groups.has(md)) groups.set(md, [])
    groups.get(md).push(m)
  }
  return groups
}

/**
 * Resolve a team name from season teams array.
 * @param {object} season
 * @param {string} teamId
 * @returns {string}
 */
function teamName(season, teamId) {
  const t = season?.teams?.find((team) => team.id === teamId)
  return t ? t.name : teamId
}

/**
 * Count how many matches have a simulated result.
 * @param {object} simulated — { matchKey: { outcome, bonusOff, bonusDef } }
 * @returns {number}
 */
export function countSimulated(simulated) {
  if (!simulated || typeof simulated !== 'object') return 0
  return Object.values(simulated).filter((v) => v && v.outcome != null).length
}

/** Track whether results changed after a first simulation */
let hasSimulated = false

function getImpactButtonLabel() {
  if (hasSimulated) return 'Recalculer'
  return 'Voir l\u2019impact'
}

function renderImpactButton(count) {
  const label = getImpactButtonLabel()
  return `
    <button class="w-sim-impact-btn" aria-label="${esc(label)} — ${count} match(s) simule(s)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      ${esc(label)}
    </button>`
}

async function handleImpact(container, season) {
  const btn = container.querySelector('.w-sim-impact-btn')
  if (!btn) return
  btn.disabled = true
  btn.setAttribute('aria-busy', 'true')
  btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> ${esc('Calcul en cours...')}`

  // Yield to UI before heavy computation
  await new Promise((r) => setTimeout(r, 0))

  const simulatedResults = get('simulatedResults') || {}
  const result = recalculateProjections(season, simulatedResults)

  set('simulatedStandings', result)
  set('simulationMode', true)
  set('activeTab', 'classements')
  hasSimulated = true

  btn.disabled = false
  btn.removeAttribute('aria-busy')
}

function renderEmpty() {
  return `
    <section class="w-sim-empty" aria-label="Aucun match a simuler">
      <div class="w-sim-empty__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      </div>
      <div class="w-sim-empty__title">Aucun match a simuler</div>
      <div class="w-sim-empty__text">Aucun match a simuler pour le moment.</div>
    </section>`
}

function renderMatchCard(match, season, simulated, key) {
  const sim = simulated[key] || { outcome: null, bonusOff: false, bonusDef: false }
  const homeName = teamName(season, match.home)
  const awayName = teamName(season, match.away)
  const homeInit = getInitials(match.home)
  const awayInit = getInitials(match.away)
  const homeFav = match.home === FAVORITE_TEAM
  const awayFav = match.away === FAVORITE_TEAM

  // Determine zone classes
  let homeZoneCls = ''
  let awayZoneCls = ''
  if (sim.outcome === 'homeWin') { homeZoneCls = ' is-winner'; awayZoneCls = ' is-loser' }
  else if (sim.outcome === 'awayWin') { awayZoneCls = ' is-winner'; homeZoneCls = ' is-loser' }

  const isSelected = sim.outcome != null

  // Bonus rules: offensive always available, defensive only for loser (not draw)
  // In draw: no defensive bonus (nobody loses)
  const showBonus = isSelected
  const showDefensive = isSelected && sim.outcome !== 'draw'

  let bonusHtml = ''
  if (showBonus) {
    const offActive = sim.bonusOff ? ' is-active' : ''
    const defActive = sim.bonusDef ? ' is-active' : ''

    bonusHtml = `<div class="w-bonus-strip is-visible">`
    bonusHtml += `<button class="w-bonus-tag${offActive}" data-key="${esc(key)}" data-bonus="offensive" role="switch" aria-checked="${sim.bonusOff}" aria-label="Bonus offensif : 3 essais de plus">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Offensif +1
    </button>`

    if (showDefensive) {
      bonusHtml += `<button class="w-bonus-tag w-bonus-tag--def${defActive}" data-key="${esc(key)}" data-bonus="defensive" role="switch" aria-checked="${sim.bonusDef}" aria-label="Bonus defensif : defaite de 5 pts max">
        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Defensif +1
      </button>`
    }

    bonusHtml += `</div>`
  }

  return `
    <div class="w-duel${isSelected ? ' is-selected' : ''}" role="group" aria-label="${esc(homeName)} contre ${esc(awayName)}" data-key="${esc(key)}">
      <div class="w-duel__ribbon" style="background:${diffColor(match.difficulty ?? 0)}"></div>
      <div class="w-duel__arena" role="radiogroup" aria-label="Resultat ${esc(homeName)} vs ${esc(awayName)}">
        <div class="w-duel__team-zone${homeZoneCls}" tabindex="0" role="radio" aria-checked="${sim.outcome === 'homeWin'}" aria-label="Victoire ${esc(homeName)}" data-key="${esc(key)}" data-result="homeWin">
          <div class="w-duel__initials">${esc(homeInit)}</div>
          <div class="w-duel__team-name${homeFav ? ' w-team--favorite' : ''}">${esc(homeName)}</div>
        </div>
        <div class="w-duel__center">
          <div class="w-duel__vs-badge">VS</div>
          <button class="w-duel__draw-btn${sim.outcome === 'draw' ? ' is-draw' : ''}" data-key="${esc(key)}" data-result="draw" role="radio" aria-checked="${sim.outcome === 'draw'}" aria-label="Match nul">Nul</button>
          <div class="w-duel__diff">${Math.round((match.difficulty ?? 0) * 100)}%</div>
        </div>
        <div class="w-duel__team-zone${awayZoneCls}" tabindex="0" role="radio" aria-checked="${sim.outcome === 'awayWin'}" aria-label="Victoire ${esc(awayName)}" data-key="${esc(key)}" data-result="awayWin">
          <div class="w-duel__initials">${esc(awayInit)}</div>
          <div class="w-duel__team-name${awayFav ? ' w-team--favorite' : ''}">${esc(awayName)}</div>
        </div>
      </div>
      ${bonusHtml}
    </div>`
}

function handleResultClick(key, result) {
  const simulated = { ...get('simulatedResults') }
  const current = simulated[key] || { outcome: null, bonusOff: false, bonusDef: false }

  if (current.outcome === result) {
    // Deselect
    delete simulated[key]
  } else {
    // Select (reset bonuses on outcome change)
    simulated[key] = { outcome: result, bonusOff: false, bonusDef: false }
  }

  set('simulatedResults', simulated)
}

function handleBonusClick(key, bonusType) {
  const simulated = { ...get('simulatedResults') }
  const current = simulated[key]
  if (!current || current.outcome == null) return

  // Toggle the specific bonus independently
  const field = bonusType === 'offensive' ? 'bonusOff' : 'bonusDef'
  simulated[key] = { ...current, [field]: !current[field] }
  set('simulatedResults', simulated)
}

function handleReset() {
  set('simulatedResults', {})
  hasSimulated = false
}

/**
 * Render the Simulateur tab.
 * @param {HTMLElement} container
 * @param {object} season
 */
export function render(container, season) {
  container.innerHTML = ''

  const calendar = season?.calendar
  const upcoming = filterUpcoming(calendar)

  const wrapper = document.createElement('div')
  wrapper.className = 'w-sim-container'

  if (upcoming.length === 0) {
    wrapper.innerHTML = `
      <header class="w-sim-header">
        <div class="w-sim-header__label">Scenarios what-if</div>
        <h1 class="w-sim-header__heading">Simulateur</h1>
        <p class="w-sim-header__sub">Choisissez vos pronostics et explorez l'impact sur le classement.</p>
      </header>
      ${renderEmpty()}`
    container.appendChild(wrapper)
    return
  }

  const simulated = get('simulatedResults') || {}
  const count = countSimulated(simulated)
  const grouped = groupByMatchday(upcoming)

  let matchCardsHtml = ''
  for (const [md, matches] of grouped) {
    matchCardsHtml += `<div class="w-journee">Journee ${md}</div>`
    for (const match of matches) {
      const key = matchKey(match)
      matchCardsHtml += renderMatchCard(match, season, simulated, key)
    }
  }

  wrapper.innerHTML = `
    <header class="w-sim-header">
      <div class="w-sim-header__label">Scenarios what-if</div>
      <h1 class="w-sim-header__heading">Simulateur</h1>
      <p class="w-sim-header__sub">Choisissez vos pronostics et explorez l'impact sur le classement.</p>
    </header>
    <div class="w-sim-bar" role="status" aria-live="polite">
      <div class="w-sim-bar__count"><span class="w-sim-bar__count-num">${count}</span> match(s) simule(s)</div>
      <button class="w-sim-bar__reset" aria-label="Reinitialiser tous les resultats simules">
        <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 1 3 6.7"/><polyline points="3 22 3 16 9 16"/></svg>
        Reinitialiser
      </button>
    </div>
    ${matchCardsHtml}
    ${count >= 1 ? renderImpactButton(count) : ''}`

  container.appendChild(wrapper)

  // Bind events using event delegation
  wrapper.addEventListener('click', (e) => {
    // Result selection (team zones and draw button)
    const resultEl = e.target.closest('[data-result]')
    if (resultEl) {
      e.preventDefault()
      handleResultClick(resultEl.dataset.key, resultEl.dataset.result)
      rerender(container, season)
      return
    }

    // Bonus toggle
    const bonusEl = e.target.closest('[data-bonus]')
    if (bonusEl) {
      e.preventDefault()
      handleBonusClick(bonusEl.dataset.key, bonusEl.dataset.bonus)
      rerender(container, season)
      return
    }

    // Impact button
    if (e.target.closest('.w-sim-impact-btn')) {
      e.preventDefault()
      handleImpact(container, season)
      return
    }

    // Reset button
    if (e.target.closest('.w-sim-bar__reset')) {
      e.preventDefault()
      handleReset()
      rerender(container, season)
    }
  })

  // Keyboard support for team zones
  wrapper.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const resultEl = e.target.closest('[data-result]')
    if (resultEl) {
      e.preventDefault()
      handleResultClick(resultEl.dataset.key, resultEl.dataset.result)
      rerender(container, season)
    }
  })
}

/**
 * Re-render the tab preserving the container reference.
 * @param {HTMLElement} container
 * @param {object} season
 */
function rerender(container, season) {
  render(container, season)
}
