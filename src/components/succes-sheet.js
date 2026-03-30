import { computeAchievements, render as renderCards } from './achievement-card.js'

let dialog = null

/**
 * Create the Succès dialog and append to container.
 * Call once at startup.
 * @param {HTMLElement} container — typically document.body
 */
export function render(container) {
  dialog = document.createElement('dialog')
  dialog.className = 'w-succes-sheet'
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', 'Succès')

  dialog.innerHTML = `
    <div class="w-succes-sheet__handle" aria-hidden="true"></div>
    <h2 class="w-succes-sheet__title">Succès</h2>
    <div class="w-succes-sheet__content"></div>
  `

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close()
  })

  container.appendChild(dialog)
}

/**
 * Open the Succès sheet with current season data.
 * @param {object} season
 */
export function open(season) {
  if (!dialog) return
  const content = dialog.querySelector('.w-succes-sheet__content')
  content.innerHTML = ''
  renderCards(content, season)
  dialog.showModal()
}

/** Close the Succès sheet. */
export function close() {
  dialog?.close()
}

/**
 * Update the badge count in the header button.
 * @param {HTMLElement} root — element containing .w-succes-btn__badge
 * @param {number} count
 */
export function updateBadge(root, count) {
  const badge = root.querySelector('.w-succes-btn__badge')
  if (!badge) return
  badge.textContent = String(count)
  badge.hidden = count === 0
  const btn = root.querySelector('.w-succes-btn')
  if (btn) btn.setAttribute('aria-label', `Succès — ${count} obtenus`)
}
