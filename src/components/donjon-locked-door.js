import '../styles/components/donjon-locked-door.css'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

let root = null
let timerId = null

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Render the locked door (next opponent) screen.
 * @param {HTMLElement} container
 * @param {{ nextOpponent: object, audio: object, onTimeout: function }} options
 */
export function render(container, { nextOpponent, audio, onTimeout }) {
  root = document.createElement('div')
  root.className = 'w-donjon-locked w-donjon__phase'

  // Padlock icon
  const padlock = document.createElement('div')
  padlock.className = 'w-donjon-locked__padlock'
  padlock.textContent = '🔒'
  padlock.setAttribute('aria-hidden', 'true')

  // Label
  const label = document.createElement('p')
  label.className = 'w-donjon-locked__label w-donjon-neon'
  label.textContent = 'PROCHAIN COMBAT'

  // Letter-by-letter opponent name
  const nameEl = document.createElement('p')
  nameEl.className = 'w-donjon-locked__opponent'
  nameEl.setAttribute('aria-label', esc(nextOpponent.opponent.name))
  const chars = nextOpponent.opponent.name.split('')
  chars.forEach((char, i) => {
    const span = document.createElement('span')
    span.className = 'w-donjon-locked__char'
    span.style.setProperty('--char-delay', `${0.8 + i * 0.05}s`)
    // Use textContent for individual chars — no HTML injection risk
    span.textContent = char
    nameEl.appendChild(span)
  })

  // Date + venue
  const info = document.createElement('p')
  info.className = 'w-donjon-locked__info'
  const venue = nextOpponent.isHome ? 'À MARCEL DEFLANDRE' : "À L'EXTÉRIEUR"
  info.textContent = `${formatDate(nextOpponent.date)} · ${venue}`

  root.append(padlock, label, nameEl, info)
  container.appendChild(root)

  audio.play('lock')

  // Auto-transition after 3s
  timerId = setTimeout(onTimeout, 3000)
}

export function destroy() {
  if (timerId) clearTimeout(timerId)
  timerId = null
  if (root) root.remove()
  root = null
}
