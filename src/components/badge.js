import '../styles/components/badge.css'
import { get, on } from '../store.js'

let dismissed = false

/**
 * Create the badge DOM element.
 * @param {number} matchday
 * @returns {HTMLSpanElement}
 */
function createBadge(matchday) {
  const el = document.createElement('span')
  el.className = 'w-badge-new'
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.textContent = `J${matchday} Nouveau`
  return el
}

/**
 * Remove the badge with a fade-out transition (or instantly for reduced motion).
 * @param {HTMLElement} badge
 */
function dismissBadge(badge) {
  const prefersReduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced) {
    badge.remove()
    return
  }

  badge.classList.add('w-badge-new--hiding')
  badge.addEventListener('transitionend', () => badge.remove(), { once: true })
}

/**
 * Render the "Nouvelle Journee" badge into the given container (badge slot).
 * Listens to store keys: dataFresh, season, revealed.
 * @param {HTMLElement} container — the w-score-card__badge-slot element
 */
export function render(container) {
  let badgeEl = null

  function tryRender() {
    if (dismissed) return
    if (!get('dataFresh')) return

    const season = get('season')
    if (!season || season.matchday == null) return

    // Already rendered
    if (badgeEl && container.contains(badgeEl)) return

    badgeEl = createBadge(season.matchday)
    container.appendChild(badgeEl)
  }

  function handleReveal(event) {
    const { value } = event.detail
    if (value !== true) return
    if (dismissed) return

    dismissed = true
    if (badgeEl && container.contains(badgeEl)) {
      dismissBadge(badgeEl)
    }
  }

  // Listen for data freshness and season data
  on('dataFresh', tryRender)
  on('season', tryRender)
  on('revealed', handleReveal)

  // Initial render if data already present
  tryRender()
}

/**
 * Reset module state (for testing).
 */
export function resetBadgeState() {
  dismissed = false
}
