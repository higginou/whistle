/** @module router — Minimal History API router (~20 lines) */

import { set } from './store.js'

/** Push a bottom-sheet state into history and update store. */
function pushSheet(sheetId) {
  history.pushState({ sheet: sheetId }, '')
  set('activeSheet', sheetId)
}

/** Handle back navigation — close any open sheet. */
function onPopState() {
  set('activeSheet', null)
}

/** Initialize router (call once at startup). */
function init() {
  window.addEventListener('popstate', onPopState)
}

export { pushSheet, init }
