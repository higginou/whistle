import '../styles/components/donjon-splash.css'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

let root = null
let counterId = null

/**
 * Render splash screen.
 * @param {HTMLElement} container
 * @param {{ matchesPlayed: number, totalMatchdays: number, onStart: function }} options
 */
export function render(container, { matchesPlayed, totalMatchdays, onStart }) {
  root = document.createElement('div')
  root.className = 'w-donjon-splash w-donjon__phase'

  const title = document.createElement('h1')
  title.className = 'w-donjon-splash__title w-donjon-neon'
  title.textContent = 'DONJON'

  const subtitle = document.createElement('p')
  subtitle.className = 'w-donjon-splash__subtitle'
  subtitle.textContent = 'SAISON 2025\u00b726'

  const counter = document.createElement('p')
  counter.className = 'w-donjon-splash__counter'
  counter.setAttribute('aria-label', `${esc(String(matchesPlayed))} combats sur ${esc(String(totalMatchdays))} disput\u00e9s`)
  counter.textContent = `0 / ${esc(String(totalMatchdays))} COMBATS DISPUT\u00c9S`

  const btn = document.createElement('button')
  btn.className = 'w-donjon-splash__fight'
  btn.textContent = 'FIGHT'
  btn.setAttribute('aria-label', 'D\u00e9marrer le donjon')

  btn.addEventListener('click', onStart)

  root.append(title, subtitle, counter, btn)
  container.appendChild(root)

  // Trigger animations
  requestAnimationFrame(() => {
    title.classList.add('w-donjon-splash__title--visible')
    subtitle.classList.add('w-donjon-splash__subtitle--visible')
    counter.classList.add('w-donjon-splash__counter--visible')
    btn.classList.add('w-donjon-splash__fight--visible')
  })

  // Animate counter from 0 to matchesPlayed
  let current = 0
  const step = Math.max(1, Math.floor(matchesPlayed / 20))
  counterId = setInterval(() => {
    current = Math.min(current + step, matchesPlayed)
    counter.textContent = `${current} / ${totalMatchdays} COMBATS DISPUT\u00c9S`
    if (current >= matchesPlayed) clearInterval(counterId)
  }, 50)
}

export function destroy() {
  if (counterId) clearInterval(counterId)
  if (root) root.remove()
  root = null
}
