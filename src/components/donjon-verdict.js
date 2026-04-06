import '../styles/components/donjon-verdict.css'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

let root = null
let timeouts = []

function wait(ms) {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms)
    timeouts.push(id)
  })
}

/**
 * Determine verdict display tier.
 * @param {"win"|"loss"|"draw"} result
 * @param {"large"|"medium"|"close"} magnitude
 * @param {{ offensive: boolean, defensive: boolean }} lrBonus
 * @returns {"win-large"|"win-small"|"draw"|"loss-small"|"loss-large"}
 */
export function getVerdictTier(result, magnitude, lrBonus) {
  if (result === 'draw') return 'draw'
  if (result === 'win') {
    if (magnitude === 'large' || lrBonus.offensive) return 'win-large'
    return 'win-small'
  }
  // loss
  if (magnitude === 'close' || lrBonus.defensive) return 'loss-small'
  return 'loss-large'
}

/**
 * Render the verdict screen.
 * @param {HTMLElement} container
 * @param {{ match: object, audio: object, onNext: function, onShake: function }} options
 */
export function render(container, { match, audio, onNext, onShake }) {
  root = document.createElement('div')
  root.className = 'w-donjon-verdict w-donjon__phase'

  const tier = getVerdictTier(match.result, match.magnitude, match.bonus.lr)

  const TIER_LABELS = {
    'win-large': 'VICTOIRE !',
    'win-small': 'VICTOIRE',
    draw: 'NULS',
    'loss-small': 'DÉFAITE',
    'loss-large': 'DÉFAITE !',
  }

  // Verdict text
  const textEl = document.createElement('p')
  textEl.className = `w-donjon-verdict__text w-donjon-verdict__text--${tier}`
  textEl.setAttribute('aria-live', 'assertive')
  textEl.textContent = TIER_LABELS[tier]

  // Score
  const scoreEl = document.createElement('p')
  scoreEl.className = 'w-donjon-verdict__score'
  scoreEl.setAttribute('aria-label', `Score : ${match.score.lr} à ${match.score.opponent}`)
  scoreEl.textContent = `${esc(String(match.score.lr))} — ${esc(String(match.score.opponent))}`

  // SUIVANT button
  const nextBtn = document.createElement('button')
  nextBtn.className = 'w-donjon-verdict__next'
  nextBtn.textContent = 'SUIVANT'
  nextBtn.setAttribute('aria-label', 'Passer au prochain match')
  nextBtn.addEventListener('click', onNext)

  root.append(textEl, scoreEl, nextBtn)

  // Particles for win-large
  if (tier === 'win-large') {
    const count = 15 + Math.floor(Math.random() * 6)
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span')
      particle.className = 'w-donjon-verdict__particle'
      particle.setAttribute('aria-hidden', 'true')
      particle.style.setProperty('--x', `${Math.random() * 100}%`)
      particle.style.setProperty('--y', `${Math.random() * 100}%`)
      particle.style.setProperty('--delay', `${(Math.random() * 0.5).toFixed(2)}s`)
      root.appendChild(particle)
    }
  }

  // Vignette for loss-large
  if (tier === 'loss-large') {
    const vignette = document.createElement('div')
    vignette.className = 'w-donjon-verdict__vignette'
    vignette.setAttribute('aria-hidden', 'true')
    root.appendChild(vignette)
  }

  container.appendChild(root)

  // Trigger animations
  requestAnimationFrame(() => {
    textEl.classList.add('w-donjon-verdict__text--visible')
    scoreEl.classList.add('w-donjon-verdict__score--visible')
  })

  // Play audio + shake
  audio.play(tier)
  onShake(tier)

  // Show SUIVANT after 1500ms
  wait(1500).then(() => {
    nextBtn.classList.add('w-donjon-verdict__next--visible')
  })
}

export function destroy() {
  for (const id of timeouts) clearTimeout(id)
  timeouts = []
  if (root) root.remove()
  root = null
}
