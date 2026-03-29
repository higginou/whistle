import '../styles/components/confidence-bar.css'

/**
 * Determine confidence level from decimal value.
 * @param {number} confidence — 0 to 1
 * @returns {{ level: string, cls: string }}
 */
export function getConfidenceLevel(confidence) {
  if (confidence > 0.7) return { level: 'elevee', cls: 'high' }
  if (confidence >= 0.4) return { level: 'moyenne', cls: 'mid' }
  return { level: 'basse', cls: 'low' }
}

/**
 * Render a confidence bar (4px meter) into the given container.
 * @param {HTMLElement} container
 * @param {number} confidence — decimal 0 to 1
 * @returns {HTMLElement} the meter element
 */
export function render(container, confidence) {
  if (confidence == null) confidence = 0
  const { level, cls } = getConfidenceLevel(confidence)
  const pct = Math.round(confidence * 100)

  const wrapper = document.createElement('span')
  wrapper.className = 'w-confidence-bar'
  wrapper.setAttribute('role', 'meter')
  wrapper.setAttribute('aria-valuemin', '0')
  wrapper.setAttribute('aria-valuemax', '1')
  wrapper.setAttribute('aria-valuenow', String(confidence))
  wrapper.setAttribute('aria-label', `Confiance de la projection : ${level}`)

  const track = document.createElement('span')
  track.className = 'w-confidence-bar__track'

  const fill = document.createElement('span')
  fill.className = `w-confidence-bar__fill w-confidence-bar__fill--${cls}`
  fill.style.width = `${pct}%`

  track.appendChild(fill)

  const label = document.createElement('span')
  label.className = `w-confidence-bar__label w-confidence-bar__label--${cls}`
  label.textContent = `${pct}%`

  wrapper.appendChild(track)
  wrapper.appendChild(label)
  container.appendChild(wrapper)

  return wrapper
}
