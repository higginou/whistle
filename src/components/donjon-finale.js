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

  const totalTries = matches.reduce((sum, m) => sum + m.tries.lr, 0)
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
