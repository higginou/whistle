/** @module router — History API router for tabs and sheets */

import { set } from './store.js'

/** Ordered tab IDs matching bottom nav order. */
const TAB_IDS = ['classements', 'projection', 'duels', 'donjon', 'oracle', 'simulateur']

function routePathname() {
  const hash = window.location.hash
  if (hash.startsWith('#/')) return hash.slice(1)
  return window.location.pathname
}

function basePathname() {
  return window.location.pathname
}

/**
 * Derive active tab from current pathname.
 * Works with or without a base path (e.g., /whistle/).
 * @returns {string} tab ID
 */
export function tabFromCurrentPath() {
  const pathname = routePathname()
  for (const id of TAB_IDS) {
    if (id === 'classements') continue
    if (pathname.endsWith(`/${id}`)) return id
  }
  return 'classements'
}

/**
 * Push a tab navigation state.
 * Builds path by replacing the current tab suffix.
 * @param {string} tabId
 */
export function pushTab(tabId) {
  const currentPath = basePathname()
  const base = currentPath === '/' ? '' : currentPath.replace(/\/$/, '').replace(
    /\/(projection|duels|donjon|oracle|simulateur)$/,
    '',
  )
  const suffix = tabId === 'classements' ? '' : `/${tabId}`
  const path = `${base}${suffix}` || '/'
  history.pushState({ tab: tabId }, '', path)
  set('activeTab', tabId)
}

/**
 * Push a bottom-sheet state on top of current tab URL.
 * @param {string} sheetId
 */
export function pushSheet(sheetId) {
  history.pushState({ sheet: sheetId }, '')
  set('activeSheet', sheetId)
}

/**
 * Handle back navigation. Inspects event.state to distinguish sheet vs tab pops.
 * - state has `sheet` → sheet pop: close sheet
 * - state has `tab` (but no `sheet`) → tab pop: sync activeTab store from state
 * - state is null → initial load or unknown: sync activeTab from current pathname
 * app.js MUST NOT add its own popstate listener — it listens to the activeTab store event.
 */
function onPopState(event) {
  if (event.state?.sheet) {
    set('activeSheet', null)
  } else {
    // Tab pop or initial replaceState: sync store from state.tab or current pathname
    const tabId = event.state?.tab ?? tabFromCurrentPath()
    set('activeTab', tabId)
  }
}

/** Initialize router (call once at startup). */
export function init() {
  window.addEventListener('popstate', onPopState)
}
