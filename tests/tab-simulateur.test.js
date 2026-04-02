// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { set, get, on, reset } from '../src/store.js'
import {
  render,
  filterUpcoming,
  matchKey,
  getInitials,
  countSimulated,
} from '../src/components/tab-simulateur.js'

function makeSeason(calendarOverrides = []) {
  return {
    matchday: 20,
    teams: [
      { id: 'toulouse', name: 'Stade Toulousain', currentRank: 1 },
      { id: 'la-rochelle', name: 'Stade Rochelais', currentRank: 2 },
      { id: 'bordeaux-begles', name: 'Union Bordeaux-Begles', currentRank: 3 },
      { id: 'racing-92', name: 'Racing 92', currentRank: 4 },
    ],
    calendar: calendarOverrides,
  }
}

function upcomingCalendar() {
  return [
    { matchday: 21, date: '2026-04-05T14:00:00Z', home: 'toulouse', away: 'la-rochelle', difficulty: 0.82 },
    { matchday: 21, date: '2026-04-05T16:00:00Z', home: 'bordeaux-begles', away: 'racing-92', difficulty: 0.55 },
  ]
}

function playedCalendar() {
  return [
    { matchday: 20, date: '2026-03-29T14:00:00Z', home: 'toulouse', away: 'bordeaux-begles', homeScore: 24, awayScore: 18, difficulty: 0.6 },
  ]
}

describe('filterUpcoming', () => {
  it('returns matches without homeScore', () => {
    const calendar = [...playedCalendar(), ...upcomingCalendar()]
    const result = filterUpcoming(calendar)
    expect(result).toHaveLength(2)
    expect(result[0].home).toBe('toulouse')
    expect(result[1].home).toBe('bordeaux-begles')
  })

  it('returns empty for null/undefined calendar', () => {
    expect(filterUpcoming(null)).toEqual([])
    expect(filterUpcoming(undefined)).toEqual([])
  })

  it('returns empty for all played matches', () => {
    expect(filterUpcoming(playedCalendar())).toEqual([])
  })

  it('treats homeScore: 0 as played', () => {
    const calendar = [{ matchday: 20, home: 'a', away: 'b', homeScore: 0, awayScore: 3 }]
    expect(filterUpcoming(calendar)).toEqual([])
  })
})

describe('matchKey', () => {
  it('builds key from matchday-home-away', () => {
    expect(matchKey({ matchday: 21, home: 'toulouse', away: 'la-rochelle' }))
      .toBe('21-toulouse-la-rochelle')
  })
})

describe('getInitials', () => {
  it('returns first 3 chars for single-part IDs', () => {
    expect(getInitials('toulouse')).toBe('TOU')
    expect(getInitials('pau')).toBe('PAU')
    expect(getInitials('clermont')).toBe('CLE')
  })

  it('returns first letters for multi-part IDs', () => {
    expect(getInitials('la-rochelle')).toBe('LR')
    expect(getInitials('bordeaux-begles')).toBe('BB')
    expect(getInitials('stade-francais')).toBe('SF')
  })

  it('keeps numbers in multi-part IDs', () => {
    expect(getInitials('racing-92')).toBe('R92')
  })
})

describe('countSimulated', () => {
  it('returns 0 for empty object', () => {
    expect(countSimulated({})).toBe(0)
  })

  it('counts entries with non-null outcome', () => {
    expect(countSimulated({
      'a': { outcome: 'homeWin', bonusOff: false, bonusDef: false },
      'b': { outcome: null, bonusOff: false, bonusDef: false },
      'c': { outcome: 'draw', bonusOff: true, bonusDef: false },
    })).toBe(2)
  })

  it('returns 0 for null/undefined', () => {
    expect(countSimulated(null)).toBe(0)
    expect(countSimulated(undefined)).toBe(0)
  })
})

describe('store simulatedResults', () => {
  beforeEach(() => reset())

  it('has initial value of empty object', () => {
    expect(get('simulatedResults')).toEqual({})
  })

  it('can set and get simulatedResults', () => {
    const data = { '21-toulouse-la-rochelle': { outcome: 'homeWin', bonusOff: false, bonusDef: false } }
    set('simulatedResults', data)
    expect(get('simulatedResults')).toEqual(data)
  })

  it('fires simulated-results-changed event', () => {
    let fired = false
    on('simulatedResults', () => { fired = true })
    set('simulatedResults', { x: { outcome: 'draw', bonusOff: false, bonusDef: false } })
    expect(fired).toBe(true)
  })

  it('resets to empty object', () => {
    set('simulatedResults', { a: { outcome: 'homeWin', bonusOff: false, bonusDef: false } })
    reset()
    expect(get('simulatedResults')).toEqual({})
  })
})

describe('render', () => {
  let container

  beforeEach(() => {
    reset()
    container = document.createElement('div')
  })

  it('renders empty state when no calendar', () => {
    render(container, makeSeason())
    expect(container.querySelector('.w-sim-empty')).toBeTruthy()
    expect(container.querySelector('.w-sim-empty__title').textContent).toContain('Aucun match')
  })

  it('renders empty state when calendar has only played matches', () => {
    render(container, makeSeason(playedCalendar()))
    expect(container.querySelector('.w-sim-empty')).toBeTruthy()
  })

  it('renders empty state when calendar is absent', () => {
    render(container, { teams: [] })
    expect(container.querySelector('.w-sim-empty')).toBeTruthy()
  })

  it('renders match cards for upcoming matches', () => {
    render(container, makeSeason(upcomingCalendar()))
    const duels = container.querySelectorAll('.w-duel')
    expect(duels).toHaveLength(2)
  })

  it('renders journee label', () => {
    render(container, makeSeason(upcomingCalendar()))
    const journee = container.querySelector('.w-journee')
    expect(journee.textContent).toContain('Journee 21')
  })

  it('renders header with title', () => {
    render(container, makeSeason(upcomingCalendar()))
    expect(container.querySelector('.w-sim-header__heading').textContent).toBe('Simulateur')
  })

  it('renders counter bar with 0 initial count', () => {
    render(container, makeSeason(upcomingCalendar()))
    const countNum = container.querySelector('.w-sim-bar__count-num')
    expect(countNum.textContent).toBe('0')
  })

  it('renders reset button', () => {
    render(container, makeSeason(upcomingCalendar()))
    const reset = container.querySelector('.w-sim-bar__reset')
    expect(reset).toBeTruthy()
    expect(reset.getAttribute('aria-label')).toContain('Reinitialiser')
  })

  it('renders team names from season data', () => {
    render(container, makeSeason(upcomingCalendar()))
    const names = container.querySelectorAll('.w-duel__team-name')
    const texts = [...names].map((n) => n.textContent)
    expect(texts).toContain('Stade Toulousain')
    expect(texts).toContain('Stade Rochelais')
  })

  it('renders initials in circles', () => {
    render(container, makeSeason(upcomingCalendar()))
    const initials = container.querySelectorAll('.w-duel__initials')
    const texts = [...initials].map((i) => i.textContent)
    expect(texts).toContain('TOU')
    expect(texts).toContain('LR')
  })

  it('marks La Rochelle as favorite', () => {
    render(container, makeSeason(upcomingCalendar()))
    const favorites = container.querySelectorAll('.w-team--favorite')
    expect(favorites.length).toBeGreaterThanOrEqual(1)
    expect(favorites[0].textContent).toBe('Stade Rochelais')
  })

  it('renders difficulty percentage', () => {
    render(container, makeSeason(upcomingCalendar()))
    const diffs = container.querySelectorAll('.w-duel__diff')
    expect(diffs[0].textContent).toBe('82%')
    expect(diffs[1].textContent).toBe('55%')
  })
})

describe('interactions', () => {
  let container

  beforeEach(() => {
    reset()
    container = document.createElement('div')
  })

  it('selects homeWin on team zone click', () => {
    render(container, makeSeason(upcomingCalendar()))
    const homeZone = container.querySelector('[data-result="homeWin"]')
    homeZone.click()

    const sim = get('simulatedResults')
    expect(sim['21-toulouse-la-rochelle']).toEqual({ outcome: 'homeWin', bonusOff: false, bonusDef: false })
  })

  it('deselects on re-click', () => {
    render(container, makeSeason(upcomingCalendar()))
    const homeZone = container.querySelector('[data-result="homeWin"]')
    homeZone.click()

    // Re-render triggers; get fresh element
    const homeZone2 = container.querySelector('[data-result="homeWin"]')
    homeZone2.click()

    const sim = get('simulatedResults')
    expect(sim['21-toulouse-la-rochelle']).toBeUndefined()
  })

  it('selects draw', () => {
    render(container, makeSeason(upcomingCalendar()))
    const drawBtn = container.querySelector('[data-result="draw"]')
    drawBtn.click()

    const sim = get('simulatedResults')
    expect(sim['21-toulouse-la-rochelle'].outcome).toBe('draw')
  })

  it('updates counter on selection', () => {
    render(container, makeSeason(upcomingCalendar()))
    container.querySelector('[data-result="homeWin"]').click()

    const countNum = container.querySelector('.w-sim-bar__count-num')
    expect(countNum.textContent).toBe('1')
  })

  it('resets all selections on reset click', () => {
    render(container, makeSeason(upcomingCalendar()))

    // Select two matches
    const homeZones = container.querySelectorAll('[data-result="homeWin"]')
    homeZones[0].click()
    const homeZones2 = container.querySelectorAll('[data-result="homeWin"]')
    homeZones2[1].click()

    expect(countSimulated(get('simulatedResults'))).toBe(2)

    // Reset
    const resetBtn = container.querySelector('.w-sim-bar__reset')
    resetBtn.click()

    expect(get('simulatedResults')).toEqual({})
    const countNum = container.querySelector('.w-sim-bar__count-num')
    expect(countNum.textContent).toBe('0')
  })

  it('shows bonus strip after selecting outcome', () => {
    render(container, makeSeason(upcomingCalendar()))

    // Before selection: no bonus strip visible
    expect(container.querySelector('.w-bonus-strip.is-visible')).toBeNull()

    container.querySelector('[data-result="homeWin"]').click()

    // After selection: bonus strip visible
    expect(container.querySelector('.w-bonus-strip.is-visible')).toBeTruthy()
  })

  it('toggles offensive bonus', () => {
    render(container, makeSeason(upcomingCalendar()))
    container.querySelector('[data-result="homeWin"]').click()

    const offBtn = container.querySelector('[data-bonus="offensive"]')
    offBtn.click()

    const sim = get('simulatedResults')
    expect(sim['21-toulouse-la-rochelle'].bonusOff).toBe(true)
  })

  it('hides defensive bonus on draw', () => {
    render(container, makeSeason(upcomingCalendar()))
    container.querySelector('[data-result="draw"]').click()

    const defBtn = container.querySelector('[data-bonus="defensive"]')
    expect(defBtn).toBeNull()
  })

  it('shows defensive bonus on non-draw selection', () => {
    render(container, makeSeason(upcomingCalendar()))
    container.querySelector('[data-result="homeWin"]').click()

    const defBtn = container.querySelector('[data-bonus="defensive"]')
    expect(defBtn).toBeTruthy()
  })

  it('clears bonus when changing outcome', () => {
    render(container, makeSeason(upcomingCalendar()))
    container.querySelector('[data-result="homeWin"]').click()
    container.querySelector('[data-bonus="offensive"]').click()

    expect(get('simulatedResults')['21-toulouse-la-rochelle'].bonusOff).toBe(true)

    // Switch to awayWin
    container.querySelector('[data-result="awayWin"]').click()

    expect(get('simulatedResults')['21-toulouse-la-rochelle'].bonusOff).toBe(false)
    expect(get('simulatedResults')['21-toulouse-la-rochelle'].bonusDef).toBe(false)
  })
})

describe('accessibility', () => {
  let container

  beforeEach(() => {
    reset()
    container = document.createElement('div')
  })

  it('has radiogroup role on arena', () => {
    render(container, makeSeason(upcomingCalendar()))
    const rg = container.querySelector('[role="radiogroup"]')
    expect(rg).toBeTruthy()
    expect(rg.getAttribute('aria-label')).toContain('Stade Toulousain')
  })

  it('has radio role on team zones and draw button', () => {
    render(container, makeSeason(upcomingCalendar()))
    const radios = container.querySelectorAll('[role="radio"]')
    // 2 matches x 3 options = 6
    expect(radios).toHaveLength(6)
  })

  it('has aria-checked on radio elements', () => {
    render(container, makeSeason(upcomingCalendar()))
    const radios = container.querySelectorAll('[role="radio"]')
    for (const radio of radios) {
      expect(radio.getAttribute('aria-checked')).toBe('false')
    }

    // Select home win
    container.querySelector('[data-result="homeWin"]').click()
    const homeRadio = container.querySelector('[data-result="homeWin"]')
    expect(homeRadio.getAttribute('aria-checked')).toBe('true')
  })

  it('has switch role on bonus toggles', () => {
    render(container, makeSeason(upcomingCalendar()))
    container.querySelector('[data-result="homeWin"]').click()

    const switches = container.querySelectorAll('[role="switch"]')
    expect(switches.length).toBeGreaterThanOrEqual(1)
  })

  it('has aria-live on counter', () => {
    render(container, makeSeason(upcomingCalendar()))
    const bar = container.querySelector('.w-sim-bar')
    expect(bar.getAttribute('aria-live')).toBe('polite')
  })

  it('has aria-label on reset button', () => {
    render(container, makeSeason(upcomingCalendar()))
    const btn = container.querySelector('.w-sim-bar__reset')
    expect(btn.getAttribute('aria-label')).toContain('Reinitialiser')
  })

  it('has tabindex on team zones', () => {
    render(container, makeSeason(upcomingCalendar()))
    const zones = container.querySelectorAll('.w-duel__team-zone')
    for (const zone of zones) {
      expect(zone.getAttribute('tabindex')).toBe('0')
    }
  })

  it('responds to keyboard Enter on team zone', () => {
    render(container, makeSeason(upcomingCalendar()))
    const zone = container.querySelector('[data-result="homeWin"]')
    zone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    const sim = get('simulatedResults')
    expect(sim['21-toulouse-la-rochelle']).toEqual({ outcome: 'homeWin', bonusOff: false, bonusDef: false })
  })

  it('responds to keyboard Space on team zone', () => {
    render(container, makeSeason(upcomingCalendar()))
    const zone = container.querySelector('[data-result="homeWin"]')
    zone.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))

    const sim = get('simulatedResults')
    expect(sim['21-toulouse-la-rochelle']).toEqual({ outcome: 'homeWin', bonusOff: false, bonusDef: false })
  })

  it('empty state has aria-label', () => {
    render(container, makeSeason())
    const empty = container.querySelector('.w-sim-empty')
    expect(empty.getAttribute('aria-label')).toContain('Aucun match')
  })
})

describe('multiple matchdays', () => {
  beforeEach(() => reset())

  it('groups matches by matchday', () => {
    const calendar = [
      { matchday: 21, home: 'toulouse', away: 'la-rochelle', difficulty: 0.8 },
      { matchday: 22, home: 'bordeaux-begles', away: 'racing-92', difficulty: 0.5 },
    ]
    const container = document.createElement('div')
    render(container, makeSeason(calendar))

    const journees = container.querySelectorAll('.w-journee')
    expect(journees).toHaveLength(2)
    expect(journees[0].textContent).toContain('21')
    expect(journees[1].textContent).toContain('22')
  })
})
