/** @module donjon-data — Normalize scraped match data for Donjon consumption */

const LR_ID = 'la-rochelle'

export function deriveMagnitude(scoreA, scoreB) {
  const gap = Math.abs(scoreA - scoreB)
  if (gap >= 16) return 'large'
  if (gap >= 8) return 'medium'
  return 'close'
}

export function normalizeMatch(raw, teamsMap) {
  const isHome = raw.home === LR_ID
  const opponentId = isHome ? raw.away : raw.home
  const lrScore = isHome ? raw.homeScore : raw.awayScore
  const oppScore = isHome ? raw.awayScore : raw.homeScore
  const lrTries = isHome ? raw.homeTries : raw.awayTries
  const oppTries = isHome ? raw.awayTries : raw.homeTries
  const lrBonus = isHome ? raw.homeBonus : raw.awayBonus
  const oppBonus = isHome ? raw.awayBonus : raw.homeBonus

  let result = 'draw'
  if (lrScore > oppScore) result = 'win'
  else if (lrScore < oppScore) result = 'loss'

  return {
    matchday: raw.matchday,
    date: raw.date,
    isHome,
    opponent: { id: opponentId, name: teamsMap.get(opponentId) || opponentId },
    score: { lr: lrScore, opponent: oppScore },
    tries: { lr: lrTries, opponent: oppTries },
    bonus: { lr: lrBonus, opponent: oppBonus },
    conversions: null,
    penalties: null,
    cards: null,
    scorers: null,
    result,
    magnitude: deriveMagnitude(lrScore, oppScore),
  }
}

export function normalizeMatches(results, teamsMap) {
  return results
    .filter((r) => r.home === LR_ID || r.away === LR_ID)
    .sort((a, b) => a.matchday - b.matchday)
    .map((r) => normalizeMatch(r, teamsMap))
}

export function findNextOpponent(calendar, lastPlayedMatchday, teamsMap) {
  const next = calendar
    .filter((c) => c.home === LR_ID || c.away === LR_ID)
    .sort((a, b) => a.matchday - b.matchday)
    .find((c) => c.matchday > lastPlayedMatchday)
  if (!next) return null
  const isHome = next.home === LR_ID
  const opponentId = isHome ? next.away : next.home
  return {
    matchday: next.matchday,
    date: next.date,
    opponent: { id: opponentId, name: teamsMap.get(opponentId) || opponentId },
    isHome,
  }
}

export function buildTeamsMap(teams) {
  return new Map(teams.map((t) => [t.id, t.name]))
}
