/** @module store — EventTarget-based state store (singleton) */

const EVENT_NAMES = {
  season: 'season-loaded',
  revealed: 'reveal-triggered',
  activeSheet: 'sheet-opened',
  selectedTeam: 'team-selected',
  dataFresh: 'data-fresh',
  dataStale: 'data-stale',
  activeTab: 'tab-changed',
  viewMode: 'mode-changed',
  simulatedResults: 'simulated-results-changed',
  simulationMode: 'simulation-mode-changed',
  simulatedStandings: 'simulated-standings-changed',
  supporterScore: 'supporter-score-changed',
  tribuneArrivalClosed: 'tribune-arrival-closed',
}

const INITIAL_STATE = {
  season: null,
  revealed: false,
  activeSheet: null,
  selectedTeam: null,
  dataFresh: false,
  dataStale: null,
  activeTab: 'classements',
  viewMode: 'simple',
  simulatedResults: {},
  simulationMode: false,
  simulatedStandings: null,
  supporterScore: 0,
  tribuneArrivalClosed: false,
}

const state = { ...INITIAL_STATE }

let emitter = new EventTarget()

/** @returns {*} current value for key, or undefined for unknown keys */
function get(key) {
  if (!(key in EVENT_NAMES)) return undefined
  return state[key]
}

/**
 * Update value and dispatch a CustomEvent.
 * Silently ignores unknown keys.
 * @param {string} key
 * @param {*} value
 */
function set(key, value) {
  if (!(key in EVENT_NAMES)) return
  const previous = state[key]
  state[key] = value
  emitter.dispatchEvent(
    new CustomEvent(EVENT_NAMES[key], { detail: { value, previous } }),
  )
}

/**
 * Listen to changes on a key.
 * Silently ignores unknown keys (returns a no-op unsubscribe).
 * @param {string} key
 * @param {function} callback — receives CustomEvent with { detail: { value, previous } }
 * @returns {function} unsubscribe function
 */
function on(key, callback) {
  const eventName = EVENT_NAMES[key]
  if (!eventName) return () => {}
  emitter.addEventListener(eventName, callback)
  return () => emitter.removeEventListener(eventName, callback)
}

/**
 * Reset state to initial values and remove all event listeners.
 * Primarily useful for test isolation.
 */
function reset() {
  for (const k of Object.keys(INITIAL_STATE)) {
    state[k] = INITIAL_STATE[k]
  }
  emitter = new EventTarget()
}

export { get, set, on, reset }
