import '../styles/components/tab-duels.css'
import { get } from '../store.js'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const FAVORITE_TEAM = 'la-rochelle'

/**
 * Build tiebreaker groups from season data.
 * Groups teams that have `tiebreaker: 'h2h'` and share the same currentRank
 * neighborhood (contiguous ranks where all teams are flagged).
 *
 * @param {object} season
 * @returns {Array<{ ranks: number[], teams: object[], h2hEntries: object[] }>}
 */
export function buildTiebreakerGroups(season) {
  const teams = season?.teams
  const headToHead = season?.headToHead
  if (!Array.isArray(teams)) return []
  if (!Array.isArray(headToHead)) return []

  // Find teams flagged with tiebreaker (value is 'h2h-N' where N is group id)
  const tbTeams = teams
    .filter((t) => typeof t.tiebreaker === 'string' && t.tiebreaker.startsWith('h2h'))
    .sort((a, b) => a.currentRank - b.currentRank)

  if (tbTeams.length === 0) return []

  // Group by tiebreaker value (e.g., 'h2h-1', 'h2h-2')
  const groupMap = new Map()
  for (const team of tbTeams) {
    const key = team.tiebreaker
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key).push(team)
  }
  const groups = [...groupMap.values()]

  // Build H2H lookup
  const h2hByPair = new Map()
  for (const entry of headToHead) {
    const key = [...entry.teams].sort().join(':')
    h2hByPair.set(key, entry)
  }

  return groups.map((groupTeams) => {
    const teamIds = new Set(groupTeams.map((t) => t.id))
    const ranks = groupTeams.map((t) => t.currentRank)

    // Collect relevant H2H entries for this group
    const h2hEntries = []
    const ids = [...teamIds]
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join(':')
        const entry = h2hByPair.get(key)
        if (entry) h2hEntries.push(entry)
      }
    }

    return { ranks, teams: groupTeams, h2hEntries }
  })
}

/**
 * Compute H2H balance for a team within a group.
 * Sums wins/draws/losses across all H2H entries involving the team.
 *
 * @param {string} teamId
 * @param {object[]} h2hEntries
 * @returns {{ w: number, d: number, l: number }}
 */
export function computeTeamH2HBalance(teamId, h2hEntries) {
  let w = 0, d = 0, l = 0
  for (const entry of h2hEntries) {
    const rec = entry.record?.[teamId]
    if (rec) {
      w += rec.w
      d += rec.d
      l += rec.l
    }
  }
  return { w, d, l }
}

function formatBalance(bal) {
  const parts = []
  if (bal.w > 0) parts.push(`${bal.w}V`)
  if (bal.d > 0) parts.push(`${bal.d}N`)
  if (bal.l > 0) parts.push(`${bal.l}D`)
  return parts.join(' ') || '0V 0D'
}

function posClass(pos) {
  if (pos <= 3) return `w-mini-rank__pos--${pos}`
  return ''
}

function renderGroupSimple(group) {
  const rows = group.teams.map((team, i) => {
    const pos = i + 1
    const bal = computeTeamH2HBalance(team.id, group.h2hEntries)
    const isFav = team.id === FAVORITE_TEAM
    const isAhead = bal.w > bal.l
    const isPromoted = team.promoted === true

    return `
      <div class="w-mini-rank__row" role="listitem">
        <span class="w-mini-rank__pos ${posClass(pos)}" aria-label="${pos === 1 ? '1er' : pos + 'e'}">${pos}</span>
        <span class="w-mini-rank__name${isFav ? ' w-mini-rank__name--favorite' : ''}">${esc(team.name)}${isPromoted ? ' <span class="w-badge-promu" aria-label="Equipe promue">Promu</span>' : ''}</span>
        <span class="w-mini-rank__result ${isAhead ? 'w-mini-rank__result--ahead' : 'w-mini-rank__result--behind'}">${esc(formatBalance(bal))}</span>
      </div>`
  }).join('')

  return `<div class="w-mini-rank" role="list" aria-label="Mini-classement du groupe">${rows}</div>`
}

function renderGroupDetailed(group) {
  // Build rows: for each team, show its record vs each opponent
  const rows = []
  for (const team of group.teams) {
    for (const entry of group.h2hEntries) {
      if (!entry.teams.includes(team.id)) continue
      const opponentId = entry.teams.find((t) => t !== team.id)
      const rec = entry.record?.[team.id]
      if (!rec) continue
      const opponent = group.teams.find((t) => t.id === opponentId)
      const opponentName = opponent ? opponent.name : opponentId

      rows.push(`
        <tr>
          <td${team.id === FAVORITE_TEAM ? ' class="w-mini-rank__name--favorite"' : ''}>${esc(team.name)}</td>
          <td class="w-h2h-vs">vs ${esc(opponentName)}</td>
          <td${rec.w > 0 ? ' class="w-h2h-cell--win"' : ''}>${rec.w}</td>
          <td${rec.d > 0 ? ' class="w-h2h-cell--draw"' : ''}>${rec.d}</td>
          <td${rec.l > 0 ? ' class="w-h2h-cell--loss"' : ''}>${rec.l}</td>
        </tr>`)
    }
  }

  return `
    <table class="w-h2h-table" aria-label="Confrontations directes du groupe">
      <thead>
        <tr>
          <th scope="col">Equipe</th>
          <th scope="col">Adversaire</th>
          <th scope="col">V</th>
          <th scope="col">N</th>
          <th scope="col">D</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>`
}

function renderGroup(group, isDetaille) {
  const minRank = Math.min(...group.ranks)
  const maxRank = Math.max(...group.ranks)
  const ranksLabel = minRank === maxRank ? `Rang ${minRank}` : `Rangs ${minRank}-${maxRank}`
  const teamCount = group.teams.length

  return `
    <section class="w-group" aria-label="Egalite ${ranksLabel}">
      <div class="w-group__header">
        <div>
          <span class="w-group__title">${esc(ranksLabel)}</span>
          <span class="w-group__ranks"> &middot; ${teamCount} equipes</span>
        </div>
        <span class="w-group__pts-badge">H2H</span>
      </div>
      ${isDetaille ? renderGroupDetailed(group) : renderGroupSimple(group)}
    </section>`
}

function renderPromotedNote(season) {
  const promoted = season?.teams?.filter((t) => t.promoted === true) ?? []
  if (promoted.length === 0) return ''

  const names = promoted.map((t) => esc(t.name)).join(', ')
  return `
    <div class="w-promoted-note" role="note" aria-label="Note sur les equipes promues">
      <span class="w-promoted-note__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg>
      </span>
      <span class="w-promoted-note__text">
        <strong>${names}</strong> <span class="w-badge-promu">Promu</span> — Equipe promue de Pro D2, confiance du modele plus faible (peu d'historique H2H en TOP 14).
      </span>
    </div>`
}

function renderEmpty() {
  return `
    <section class="w-duels-empty" aria-label="Aucun departage">
      <div class="w-duels-empty__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      </div>
      <div class="w-duels-empty__title">Aucun departage</div>
      <div class="w-duels-empty__text">Pas d'egalite de points necessitant un departage par confrontations directes.</div>
    </section>`
}

/**
 * Render the Duels tab — H2H micro-rankings for tied teams.
 * @param {HTMLElement} container
 * @param {object} season
 */
export function render(container, season) {
  container.innerHTML = ''

  const isDetaille = get('viewMode') === 'detaille'
  const groups = buildTiebreakerGroups(season)

  const wrapper = document.createElement('div')
  wrapper.className = 'w-duels-container'

  const groupsHtml = groups.length > 0
    ? groups.map((g) => renderGroup(g, isDetaille)).join('')
    : renderEmpty()

  wrapper.innerHTML = `
    <header class="w-duels-header">
      <div class="w-duels-header__label">Confrontations directes</div>
      <h1 class="w-duels-header__heading">Duels</h1>
      <p class="w-duels-header__sub">Departage des equipes a egalite de points par les resultats H2H.</p>
    </header>
    ${groupsHtml}
    ${renderPromotedNote(season)}`

  container.appendChild(wrapper)
}
