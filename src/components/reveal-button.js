/** @module reveal-button — CTA button to trigger reveal animation */

import '../styles/components/reveal-button.css'
import { get, set } from '../store.js'
import { revealProjection, resetProjection } from '../animation/engine.js'

const TEXT_DEFAULT = 'Reveler la projection'
const TEXT_ANIMATING = 'Projection en cours...'
const TEXT_REPLAY = 'Rejouer'

/**
 * Render the reveal button into the given container.
 * @param {HTMLElement} container — element to insert the button into
 */
export function render(container) {
  const button = document.createElement('button')
  button.className = 'w-reveal-button'
  button.type = 'button'
  button.textContent = TEXT_DEFAULT

  /**
   * Set button to "animating" state.
   */
  function setAnimating() {
    button.classList.add('w-reveal-button--animating')
    button.classList.remove('w-reveal-button--replay')
    button.disabled = true
    button.setAttribute('aria-busy', 'true')
    button.textContent = TEXT_ANIMATING
  }

  /**
   * Set button to "replay" state.
   */
  function setReplay() {
    button.classList.remove('w-reveal-button--animating')
    button.classList.add('w-reveal-button--replay')
    button.disabled = false
    button.removeAttribute('aria-busy')
    button.textContent = TEXT_REPLAY
  }

  /**
   * Set button to default state.
   */
  function setDefault() {
    button.classList.remove('w-reveal-button--animating', 'w-reveal-button--replay')
    button.disabled = false
    button.removeAttribute('aria-busy')
    button.textContent = TEXT_DEFAULT
  }

  /**
   * Collect rank-row elements and team data, then run the reveal.
   */
  async function handleReveal() {
    const season = get('season')
    if (!season || !Array.isArray(season.teams)) return

    const rankRows = document.querySelectorAll('.w-rank-row')
    if (rankRows.length === 0) return

    setAnimating()

    try {
      await revealProjection(rankRows, season.teams)
      set('revealed', true)
      set('dataFresh', false)
      setReplay()
    } catch {
      setDefault()
    }
  }

  /**
   * Reset positions then re-run the reveal.
   */
  async function handleReplay() {
    const season = get('season')
    if (!season || !Array.isArray(season.teams)) return

    const rankRows = document.querySelectorAll('.w-rank-row')
    if (rankRows.length === 0) return

    try {
      await resetProjection(rankRows, season.teams)
      set('revealed', false)
      await handleReveal()
    } catch {
      setDefault()
    }
  }

  // Click handler
  button.addEventListener('click', () => {
    if (button.disabled) return

    if (button.classList.contains('w-reveal-button--replay')) {
      handleReplay()
    } else {
      handleReveal()
    }
  })

  // Tactile feedback: scale on press
  button.addEventListener('pointerdown', () => {
    if (!button.disabled) {
      button.style.transform = 'scale(0.97)'
    }
  })

  const releaseScale = () => {
    button.style.transform = ''
  }
  button.addEventListener('pointerup', releaseScale)
  button.addEventListener('pointerleave', releaseScale)

  container.appendChild(button)
}
