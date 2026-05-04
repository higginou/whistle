import { get, on, set } from './store.js'

const SCORE_KEY = 'w-supporter-score'
const LAST_UPDATE_KEY = 'w-supporter-last-update'
const LAST_CONSULTATION_DAY_KEY = 'w-supporter-last-consultation-day'
const DEFAULT_SCORE = 18

const CONSULTATION_TABS = new Set(['projection', 'duels', 'oracle', 'simulateur', 'donjon'])

let initialized = false
let sawInitialTabEvent = false
const seenTabs = new Set()
const seenTeams = new Set()

function readStoredScore() {
  const raw = localStorage.getItem(SCORE_KEY)
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) ? parsed : DEFAULT_SCORE
}

function writeScore(value) {
  const next = Math.max(0, Math.round(value))
  set('supporterScore', next)
  localStorage.setItem(SCORE_KEY, String(next))
}

function bumpScore(delta) {
  if (!delta) return
  const current = get('supporterScore') ?? DEFAULT_SCORE
  writeScore(current + delta)
}

function getLaRochelle(season) {
  if (!season || !Array.isArray(season.teams)) return null
  return season.teams.find((team) => team.id === 'la-rochelle') ?? null
}

function onSeasonLoaded(event) {
  const season = event.detail.value
  if (!season) return

  const lastUpdate = season.lastUpdated ?? season.id ?? null
  if (lastUpdate) {
    const previousUpdate = localStorage.getItem(LAST_UPDATE_KEY)
    if (previousUpdate && previousUpdate !== lastUpdate) {
      bumpScore(1)
    }
    localStorage.setItem(LAST_UPDATE_KEY, lastUpdate)
  }
}

function onTabChanged(event) {
  const { value, previous } = event.detail
  if (!sawInitialTabEvent) {
    sawInitialTabEvent = true
    if (previous == null) return
  }
  if (!value || value === previous || value === 'classements') return
  if (!CONSULTATION_TABS.has(value) || seenTabs.has(value)) return

  seenTabs.add(value)
  bumpScore(1)
}

function recordDailyConsultation() {
  const today = new Date().toISOString().slice(0, 10)
  const previousDay = localStorage.getItem(LAST_CONSULTATION_DAY_KEY)

  if (previousDay && previousDay !== today) {
    bumpScore(1)
  }

  localStorage.setItem(LAST_CONSULTATION_DAY_KEY, today)
}

function onTeamSelected(event) {
  const teamId = event.detail.value
  if (!teamId || seenTeams.has(teamId)) return

  seenTeams.add(teamId)
  bumpScore(1)
}

function onSimulationMode(event) {
  const { value, previous } = event.detail
  if (value === true && previous !== true) {
    bumpScore(3)
  }
}

function onReveal(event) {
  const { value, previous } = event.detail
  if (value !== true || previous === true) return

  const season = get('season')
  const team = getLaRochelle(season)
  const outlookBonus = team && team.projectedRank < team.currentRank ? 2 : 0
  const confidenceBonus = team && team.confidence >= 0.6 ? 1 : 0
  bumpScore(1 + outlookBonus + confidenceBonus)
}

export function initSupporterScore() {
  if (initialized) return
  initialized = true

  writeScore(readStoredScore())
  recordDailyConsultation()
  on('supporterScore', (event) => {
    localStorage.setItem(SCORE_KEY, String(event.detail.value))
  })
  on('season', onSeasonLoaded)
  on('activeTab', onTabChanged)
  on('selectedTeam', onTeamSelected)
  on('simulationMode', onSimulationMode)
  on('revealed', onReveal)
}

export function resetSupporterScoreState() {
  initialized = false
  sawInitialTabEvent = false
  seenTabs.clear()
  seenTeams.clear()
}

export function getSupporterProfile(score) {
  const value = Math.max(0, Math.round(score ?? 0))

  if (value >= 90) {
    return {
      title: 'Legende rochelaise',
      note: 'La tribune vous reconnait au premier rang.',
      floor: 90,
      ceiling: 120,
    }
  }

  if (value >= 60) {
    return {
      title: 'Capitaine de tribune',
      note: 'La maree monte, le virage suit.',
      floor: 60,
      ceiling: 90,
    }
  }

  if (value >= 30) {
    return {
      title: 'Supporter experimente',
      note: 'Les automatismes rochelais sont en place.',
      floor: 30,
      ceiling: 60,
    }
  }

  return {
    title: 'Supporter prometteur',
    note: 'Les habitudes de tribune commencent ici.',
    floor: 0,
    ceiling: 30,
  }
}
