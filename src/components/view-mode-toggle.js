import '../styles/components/view-mode-toggle.css'
import { get, set, on } from '../store.js'

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Render the view-mode toggle (switch variant B — minimal) into the container.
 * @param {HTMLElement} container — element to append the toggle into
 */
export function render(container) {
  const wrapper = document.createElement('label')
  wrapper.className = 'w-view-switch'

  const labelLeft = document.createElement('span')
  labelLeft.className = 'w-view-switch__label'
  labelLeft.textContent = 'Simple'

  const track = document.createElement('button')
  track.className = 'w-view-switch__track'
  track.setAttribute('role', 'switch')
  track.setAttribute('aria-label', esc('Mode d\'affichage detaille'))
  track.setAttribute('type', 'button')

  const thumb = document.createElement('span')
  thumb.className = 'w-view-switch__thumb'
  track.appendChild(thumb)

  const labelRight = document.createElement('span')
  labelRight.className = 'w-view-switch__label'
  labelRight.textContent = esc('Detail')

  wrapper.append(labelLeft, track, labelRight)
  container.appendChild(wrapper)

  function sync(mode) {
    const isDetail = mode === 'detaille'
    track.setAttribute('aria-checked', String(isDetail))
    labelLeft.classList.toggle('w-view-switch__label--active', !isDetail)
    labelRight.classList.toggle('w-view-switch__label--active', isDetail)
  }

  // Initial state
  sync(get('viewMode'))

  // Toggle on click
  track.addEventListener('click', (e) => {
    e.preventDefault()
    const current = get('viewMode')
    set('viewMode', current === 'simple' ? 'detaille' : 'simple')
  })

  // Keyboard: Enter/Space
  track.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const current = get('viewMode')
      set('viewMode', current === 'simple' ? 'detaille' : 'simple')
    }
  })

  // Sync when store changes (e.g. from another source)
  on('viewMode', (event) => {
    sync(event.detail.value)
  })
}
