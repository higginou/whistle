import '../styles/components/tab-donjon.css'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Render the Donjon tab shell.
 * Shows 26 matchday slots; past ones marked as completed, future as upcoming.
 * @param {HTMLElement} container
 * @param {object} season
 */
export function render(container, season) {
  const TOTAL = 26
  const current = season?.matchday ?? 0

  const header = document.createElement('div')
  header.className = 'w-donjon-header'
  header.innerHTML = `
    <h2 class="w-donjon-title">Donjon — Saison 2025·26</h2>
    <p class="w-donjon-subtitle">26 journées · ${esc(current)} jouées</p>
  `

  const list = document.createElement('ol')
  list.className = 'w-donjon-list'
  list.setAttribute('aria-label', 'Journées de la saison')

  for (let i = 1; i <= TOTAL; i++) {
    const li = document.createElement('li')
    const isPast = i < current
    const isCurrent = i === current
    li.className = `w-donjon-item${isPast ? ' w-donjon-item--past' : ''}${isCurrent ? ' w-donjon-item--current' : ''}`
    li.setAttribute('aria-label', `Journée ${i}${isPast ? ', terminée' : isCurrent ? ', en cours' : ''}`)
    li.innerHTML = `
      <span class="w-donjon-item__num">${i}</span>
      <span class="w-donjon-item__label">Journée ${i}</span>
      <span class="w-donjon-item__status" aria-hidden="true">${isPast ? '✓' : isCurrent ? '▶' : '🔒'}</span>
    `
    list.appendChild(li)
  }

  container.appendChild(header)
  container.appendChild(list)
}
