import '../styles/components/zone-group.css'
import { render as renderRankRow } from './rank-row.js'

/**
 * Zone definitions: rank ranges and display metadata.
 * CSS modifier uses 'qualif' (not 'europe') per naming convention.
 */
const ZONE_DEFS = [
  { key: 'qualif', label: 'Demi-finales', minRank: 1, maxRank: 2 },
  { key: 'top6', label: 'Phases finales', minRank: 3, maxRank: 6 },
  { key: 'mid', label: 'Ventre mou', minRank: 7, maxRank: 12 },
  { key: 'relegation', label: 'Maintien', minRank: 13, maxRank: 14 },
]

/**
 * Assign teams to zones based on their currentRank.
 * @param {object[]} teams — sorted by currentRank
 * @returns {{ key: string, label: string, teams: object[] }[]}
 */
export function assignTeamsToZones(teams) {
  return ZONE_DEFS.map((zone) => ({
    key: zone.key,
    label: zone.label,
    teams: teams.filter(
      (t) => t.currentRank >= zone.minRank && t.currentRank <= zone.maxRank,
    ),
  }))
}

/**
 * Render all zone groups into the standings container.
 * Clears any existing zone content (keeps the h2 title).
 * @param {HTMLElement} container — the w-standings-section element
 * @param {object[]} teams — array of team objects sorted by currentRank
 */
export function render(container, teams) {
  // Remove previous zone groups but keep the section title
  const existing = container.querySelectorAll('.w-zone-group')
  for (const el of existing) {
    el.remove()
  }

  const zones = assignTeamsToZones(teams)

  for (const zone of zones) {
    if (zone.teams.length === 0) continue

    const section = document.createElement('section')
    section.className = `w-zone-group w-zone-group--${zone.key}`
    section.setAttribute(
      'aria-label',
      `Zone ${zone.label}, ${zone.teams.length} equipe${zone.teams.length > 1 ? 's' : ''}`,
    )

    const h2 = document.createElement('h2')
    h2.className = 'w-zone-group__header'
    h2.textContent = zone.label
    section.appendChild(h2)

    const ul = document.createElement('ul')
    ul.className = 'w-zone-group__list'

    for (const team of zone.teams) {
      renderRankRow(ul, team)
    }

    section.appendChild(ul)
    container.appendChild(section)
  }
}
