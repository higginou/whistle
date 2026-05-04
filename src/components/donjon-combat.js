import '../styles/components/donjon-combat.css'

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

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function renderTries(count) {
  if (!Number.isInteger(count)) return ''
  return `<span class="w-donjon-combat__stat w-donjon-combat__tries">${esc(String(count))} essai${count > 1 ? 's' : ''}</span>`
}

/**
 * Render the combat screen.
 * @param {HTMLElement} container
 * @param {{ match: object, audio: object, onSequenceComplete: function }} options
 */
export function render(container, { match, audio, onSequenceComplete }) {
  root = document.createElement('div')
  root.className = 'w-donjon-combat w-donjon__phase'

  // Matchday header
  const matchday = document.createElement('div')
  matchday.className = 'w-donjon-combat__matchday'
  matchday.textContent = `JOURNÉE ${match.matchday} — ${formatDate(match.date)}`

  // Arena (two columns)
  const arena = document.createElement('div')
  arena.className = 'w-donjon-combat__arena'

  // LR side (always left)
  const lrTeam = document.createElement('div')
  lrTeam.className = 'w-donjon-combat__team w-donjon-combat__team--lr'
  lrTeam.innerHTML = `
    <span class="w-donjon-combat__name w-donjon-neon">${esc('LA ROCHELLE')}</span>
    <span class="w-donjon-combat__venue">${esc(match.isHome ? 'DOM' : 'EXT')}</span>
    <span class="w-donjon-combat__score">${esc(String(match.score.lr))}</span>
    ${renderTries(match.tries.lr)}
    ${match.bonus.lr.offensive ? '<span class="w-donjon-combat__badge w-donjon-combat__badge--off">OFF</span>' : ''}
    ${match.bonus.lr.defensive ? '<span class="w-donjon-combat__badge w-donjon-combat__badge--def">DEF</span>' : ''}
  `

  // Opponent side (always right)
  const oppTeam = document.createElement('div')
  oppTeam.className = 'w-donjon-combat__team w-donjon-combat__team--opp'
  oppTeam.innerHTML = `
    <span class="w-donjon-combat__name">${esc(match.opponent.name)}</span>
    <span class="w-donjon-combat__venue">${esc(match.isHome ? 'EXT' : 'DOM')}</span>
    <span class="w-donjon-combat__score">${esc(String(match.score.opponent))}</span>
    ${renderTries(match.tries.opponent)}
    ${match.bonus.opponent.offensive ? '<span class="w-donjon-combat__badge w-donjon-combat__badge--off">OFF</span>' : ''}
    ${match.bonus.opponent.defensive ? '<span class="w-donjon-combat__badge w-donjon-combat__badge--def">DEF</span>' : ''}
  `

  arena.append(lrTeam, oppTeam)
  root.append(matchday, arena)
  container.appendChild(root)

  runSequence(root, match, audio, onSequenceComplete)
}

async function runSequence(el, match, audio, onComplete) {
  const lrTeam = el.querySelector('.w-donjon-combat__team--lr')
  const oppTeam = el.querySelector('.w-donjon-combat__team--opp')
  const matchdayEl = el.querySelector('.w-donjon-combat__matchday')

  const lrName = lrTeam.querySelector('.w-donjon-combat__name')
  const lrVenue = lrTeam.querySelector('.w-donjon-combat__venue')
  const lrScore = lrTeam.querySelector('.w-donjon-combat__score')
  const lrTries = lrTeam.querySelector('.w-donjon-combat__tries')
  const lrBadges = lrTeam.querySelectorAll('.w-donjon-combat__badge')

  const oppName = oppTeam.querySelector('.w-donjon-combat__name')
  const oppVenue = oppTeam.querySelector('.w-donjon-combat__venue')
  const oppScore = oppTeam.querySelector('.w-donjon-combat__score')
  const oppTries = oppTeam.querySelector('.w-donjon-combat__tries')
  const oppBadges = oppTeam.querySelectorAll('.w-donjon-combat__badge')

  // 1. Combatants enter (names + venue)
  lrName.classList.add('w-donjon-combat__name--visible-left')
  lrVenue.classList.add('w-donjon-combat__venue--visible-left')
  oppName.classList.add('w-donjon-combat__name--visible-right')
  oppVenue.classList.add('w-donjon-combat__venue--visible-right')
  await wait(500)

  // 2. Matchday + date
  matchdayEl.classList.add('w-donjon-combat__matchday--visible')
  await wait(400)

  // 3. LR score
  lrScore.classList.add('w-donjon-combat__score--visible')
  audio.play('score-impact')
  await wait(500)

  // 4. Opponent score
  oppScore.classList.add('w-donjon-combat__score--visible')
  audio.play('score-impact')
  await wait(400)

  if (lrTries) {
    lrTries.classList.add('w-donjon-combat__stat--visible')
    audio.play('stat-reveal')
    await wait(300)
  }

  if (oppTries) {
    oppTries.classList.add('w-donjon-combat__stat--visible')
    audio.play('stat-reveal')
    await wait(300)
  }

  // 7. LR bonuses
  for (const badge of lrBadges) {
    badge.classList.add('w-donjon-combat__badge--visible')
    audio.play('stat-reveal')
    await wait(300)
  }

  // 8. Opponent bonuses
  for (const badge of oppBadges) {
    badge.classList.add('w-donjon-combat__badge--visible')
    audio.play('stat-reveal')
    await wait(300)
  }

  // 9. Pause then signal completion
  await wait(300)
  onComplete()
}

export function destroy() {
  for (const id of timeouts) clearTimeout(id)
  timeouts = []
  if (root) root.remove()
  root = null
}
