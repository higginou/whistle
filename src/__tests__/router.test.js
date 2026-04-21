/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as store from '../store.js'
import { pushSheet, pushTab, tabFromCurrentPath, init } from '../router.js'

vi.spyOn(store, 'set')
vi.spyOn(history, 'pushState').mockImplementation(() => {})

beforeEach(() => {
  store.set.mockClear()
  history.pushState.mockClear()
})

describe('router', () => {
  it('pushSheet pushes history state and updates store', () => {
    pushSheet('team-detail')

    expect(history.pushState).toHaveBeenCalledWith(
      { sheet: 'team-detail' },
      '',
    )
    expect(store.set).toHaveBeenCalledWith('activeSheet', 'team-detail')
  })
})

describe('pushTab', () => {
  it('calls pushState with tab state', () => {
    pushTab('projection')
    expect(history.pushState).toHaveBeenCalledWith(
      { tab: 'projection' },
      '',
      expect.stringContaining('projection'),
    )
  })

  it('keeps the GitHub Pages base on hash fallback routes', () => {
    history.pushState.mockRestore()
    history.pushState({}, '', '/whistle/')
    window.location.hash = '#/duels'
    vi.spyOn(history, 'pushState').mockImplementation(() => {})

    pushTab('oracle')

    expect(history.pushState).toHaveBeenCalledWith(
      { tab: 'oracle' },
      '',
      '/whistle/oracle',
    )
  })

  it('sets activeTab in store', () => {
    pushTab('donjon')
    expect(store.set).toHaveBeenCalledWith('activeTab', 'donjon')
  })
})

describe('tabFromCurrentPath', () => {
  beforeEach(() => {
    history.pushState.mockRestore()
  })

  afterEach(() => {
    history.pushState({}, '', '/')
    vi.spyOn(history, 'pushState').mockImplementation(() => {})
  })

  it('returns classements for root path', () => {
    history.pushState({}, '', '/')
    expect(tabFromCurrentPath()).toBe('classements')
  })

  it('returns projection for /projection path', () => {
    history.pushState({}, '', '/projection')
    expect(tabFromCurrentPath()).toBe('projection')
    history.pushState({}, '', '/')
  })

  it('returns oracle for /whistle/oracle path', () => {
    history.pushState({}, '', '/whistle/oracle')
    expect(tabFromCurrentPath()).toBe('oracle')
    history.pushState({}, '', '/')
  })

  it('returns duels for hash-based GitHub Pages fallback', () => {
    history.pushState({}, '', '/whistle/#/duels')
    expect(tabFromCurrentPath()).toBe('duels')
    history.pushState({}, '', '/')
  })
})

describe('popstate — updated handler', () => {
  it('closes sheet when state has sheet property', () => {
    init()
    window.dispatchEvent(
      Object.assign(new Event('popstate'), { state: { sheet: 'team-detail' } })
    )
    expect(store.set).toHaveBeenCalledWith('activeSheet', null)
  })

  it('does NOT close sheet when state is null', () => {
    store.set.mockClear()
    init()
    window.dispatchEvent(
      Object.assign(new Event('popstate'), { state: null })
    )
    expect(store.set).not.toHaveBeenCalledWith('activeSheet', null)
  })

  it('does NOT close sheet when state has only tab property', () => {
    store.set.mockClear()
    init()
    window.dispatchEvent(
      Object.assign(new Event('popstate'), { state: { tab: 'projection' } })
    )
    expect(store.set).not.toHaveBeenCalledWith('activeSheet', null)
  })
})
