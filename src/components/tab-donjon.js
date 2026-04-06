import '../styles/components/tab-donjon.css'
import { normalizeMatches, findNextOpponent, buildTeamsMap } from './donjon-data.js'
import { render as renderSplash, destroy as destroySplash } from './donjon-splash.js'
import { render as renderCombat, destroy as destroyCombat } from './donjon-combat.js'
import { render as renderVerdict, destroy as destroyVerdict } from './donjon-verdict.js'
import { render as renderLockedDoor, destroy as destroyLockedDoor } from './donjon-locked-door.js'
import { render as renderFinale, destroy as destroyFinale } from './donjon-finale.js'
import * as audio from './donjon-audio.js'

const TOTAL_MATCHDAYS = 26

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

let root = null
let phaseContainer = null
let muteBtn = null
let flashEl = null

const state = {
  phase: 'splash',
  currentIndex: 0,
  matches: [],
  nextOpponent: null,
}

const destroyers = {
  splash: destroySplash,
  combat: destroyCombat,
  verdict: destroyVerdict,
  locked: destroyLockedDoor,
  finale: destroyFinale,
}

function destroyCurrentPhase() {
  const fn = destroyers[state.phase]
  if (fn) fn()
}

function flash() {
  if (!flashEl) return
  flashEl.classList.remove('w-donjon__flash--active')
  void flashEl.offsetWidth // force reflow
  flashEl.classList.add('w-donjon__flash--active')
}

function updateMuteBtn() {
  if (!muteBtn) return
  const muted = audio.isMuted()
  muteBtn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'
  muteBtn.setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son')
}

function transitionTo(phase) {
  destroyCurrentPhase()
  state.phase = phase

  switch (phase) {
    case 'splash':
      state.currentIndex = 0
      renderSplash(phaseContainer, {
        matchesPlayed: state.matches.length,
        totalMatchdays: TOTAL_MATCHDAYS,
        onStart: async () => {
          await audio.init()
          audio.play('fight-start')
          audio.startBGM()
          flash()
          setTimeout(() => transitionTo('combat'), 300)
        },
      })
      break

    case 'combat':
      renderCombat(phaseContainer, {
        match: state.matches[state.currentIndex],
        audio,
        onSequenceComplete: () => transitionTo('verdict'),
      })
      break

    case 'verdict':
      renderVerdict(phaseContainer, {
        match: state.matches[state.currentIndex],
        audio,
        onShake: (tier) => {
          const cls = (tier === 'loss-large' || tier === 'win-large') ? 'w-donjon--shake-heavy' : 'w-donjon--shake-light'
          root.classList.remove('w-donjon--shake-light', 'w-donjon--shake-heavy')
          void root.offsetWidth
          root.classList.add(cls)
        },
        onNext: () => {
          state.currentIndex++
          if (state.currentIndex < state.matches.length) {
            transitionTo('combat')
          } else if (state.matches.length >= TOTAL_MATCHDAYS) {
            transitionTo('finale')
          } else if (state.nextOpponent) {
            transitionTo('locked')
          } else {
            transitionTo('finale')
          }
        },
      })
      break

    case 'locked':
      renderLockedDoor(phaseContainer, {
        nextOpponent: state.nextOpponent,
        audio,
        onTimeout: () => transitionTo('finale'),
      })
      break

    case 'finale':
      audio.stopBGM()
      renderFinale(phaseContainer, {
        matches: state.matches,
        audio,
        onReplay: () => transitionTo('splash'),
      })
      break
  }
}

/**
 * Render the Donjon tab.
 * @param {HTMLElement} container
 * @param {object} season — season JSON data
 * @param {object} scraped — scraped.json data (may be null)
 */
export function render(container, season, scraped) {
  root = document.createElement('div')
  root.className = 'w-donjon w-tab-donjon'

  phaseContainer = document.createElement('div')
  phaseContainer.className = 'w-donjon__phases'

  flashEl = document.createElement('div')
  flashEl.className = 'w-donjon__flash'

  muteBtn = document.createElement('button')
  muteBtn.className = 'w-donjon__mute'
  muteBtn.addEventListener('click', () => {
    audio.setMuted(!audio.isMuted())
    updateMuteBtn()
  })
  updateMuteBtn()

  root.append(muteBtn, phaseContainer, flashEl)
  container.appendChild(root)

  // Prepare data
  if (season && scraped && scraped.results) {
    const teamsMap = buildTeamsMap(season.teams || [])
    state.matches = normalizeMatches(scraped.results, teamsMap)
    const lastMatchday = state.matches.length > 0
      ? state.matches[state.matches.length - 1].matchday
      : 0
    state.nextOpponent = findNextOpponent(season.calendar || [], lastMatchday, teamsMap)
  } else {
    state.matches = []
    state.nextOpponent = null
  }

  state.phase = 'splash'
  state.currentIndex = 0
  transitionTo('splash')
}
