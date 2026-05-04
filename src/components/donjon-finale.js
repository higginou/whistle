import '../styles/components/donjon-finale.css'

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

const RANKS = [
  { threshold: 0.85, title: 'LEGENDE', color: 'gold', tier: 5 },
  { threshold: 0.70, title: 'GLADIATEUR', color: 'purple', tier: 4 },
  { threshold: 0.55, title: 'CHEVALIER', color: 'blue', tier: 3 },
  { threshold: 0.40, title: 'ECUYER', color: 'green', tier: 2 },
  { threshold: 0, title: 'RECRUE', color: 'grey', tier: 1 },
]

export function computeFinaleStats(matches) {
  const wins = matches.filter((m) => m.result === 'win')
  const losses = matches.filter((m) => m.result === 'loss')
  const draws = matches.filter((m) => m.result === 'draw')

  const bestWin = wins.length > 0
    ? wins.reduce((a, b) => (a.score.lr - a.score.opponent) >= (b.score.lr - b.score.opponent) ? a : b)
    : null

  const worstLoss = losses.length > 0
    ? losses.reduce((a, b) => (a.score.opponent - a.score.lr) >= (b.score.opponent - b.score.lr) ? a : b)
    : null

  const knownTries = matches
    .map((m) => m.tries.lr)
    .filter((tries) => Number.isInteger(tries))
  const totalTries = knownTries.length === matches.length
    ? knownTries.reduce((sum, tries) => sum + tries, 0)
    : null
  const bonusOffensifs = matches.filter((m) => m.bonus.lr.offensive).length

  return {
    total: matches.length,
    wins: wins.length,
    losses: losses.length,
    draws: draws.length,
    bestWin,
    worstLoss,
    totalTries,
    bonusOffensifs,
  }
}

export function computeRank(wins, total) {
  const rate = total > 0 ? wins / total : 0
  const rank = RANKS.find((r) => rate >= r.threshold) || RANKS[RANKS.length - 1]
  return { title: rank.title, color: rank.color, tier: rank.tier }
}

/**
 * Render the finale (season summary + rank reveal) screen.
 * @param {HTMLElement} container
 * @param {{ matches: object[], audio: object, onReplay: function }} options
 */
export function render(container, { matches, audio, onReplay }) {
  root = document.createElement('div')
  root.className = 'w-donjon-finale w-donjon__phase'

  const stats = computeFinaleStats(matches)
  const rank = computeRank(stats.wins, stats.total)

  // Build stat lines
  const statDefs = [
    `${esc(String(stats.total))} COMBATS DISPUTÉS`,
    `${esc(String(stats.wins))} VICTOIRES — ${esc(String(stats.losses))} DÉFAITES — ${esc(String(stats.draws))} NULS`,
    stats.bestWin
      ? `MEILLEURE VICTOIRE : ${esc(String(stats.bestWin.score.lr))}-${esc(String(stats.bestWin.score.opponent))} vs ${esc(stats.bestWin.opponent.name)} (J${esc(String(stats.bestWin.matchday))})`
      : null,
    stats.worstLoss
      ? `PIRE DÉFAITE : ${esc(String(stats.worstLoss.score.lr))}-${esc(String(stats.worstLoss.score.opponent))} vs ${esc(stats.worstLoss.opponent.name)} (J${esc(String(stats.worstLoss.matchday))})`
      : null,
    Number.isInteger(stats.totalTries) ? `${esc(String(stats.totalTries))} ESSAIS MARQUÉS` : null,
    `${esc(String(stats.bonusOffensifs))} BONUS OFFENSIFS`,
  ].filter(Boolean)

  let delay = 0.3
  for (const text of statDefs) {
    const statEl = document.createElement('p')
    statEl.className = 'w-donjon-finale__stat'
    statEl.style.setProperty('--stat-delay', `${delay}s`)
    statEl.textContent = text
    root.appendChild(statEl)
    delay += 0.5
  }

  // Rank element (hidden, revealed after stats)
  const rankEl = document.createElement('p')
  rankEl.className = `w-donjon-finale__rank w-donjon-finale__rank--${rank.color} w-donjon-neon`
  rankEl.setAttribute('aria-label', `Rang : ${esc(rank.title)}`)
  rankEl.textContent = rank.title

  // REJOUER button (hidden initially)
  const replayBtn = document.createElement('button')
  replayBtn.className = 'w-donjon-finale__replay'
  replayBtn.textContent = 'REJOUER'
  replayBtn.setAttribute('aria-label', 'Rejouer le donjon depuis le début')
  replayBtn.addEventListener('click', onReplay)

  root.append(rankEl, replayBtn)
  container.appendChild(root)

  // Reveal rank + button after all stats have animated in
  const rankDelay = delay + 1
  wait(rankDelay * 1000).then(() => {
    rankEl.classList.add('w-donjon-finale__rank--visible')
    audio.play('finale-reveal')
    replayBtn.classList.add('w-donjon-finale__replay--visible')
  })
}

export function destroy() {
  for (const id of timeouts) clearTimeout(id)
  timeouts = []
  if (root) root.remove()
  root = null
}
