/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as store from '../store.js'
import { pushSheet, init } from '../router.js'

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

  it('popstate sets activeSheet to null', () => {
    init()

    window.dispatchEvent(new Event('popstate'))

    expect(store.set).toHaveBeenCalledWith('activeSheet', null)
  })
})
