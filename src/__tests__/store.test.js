import { beforeEach, describe, it, expect } from 'vitest'
import { get, set, on, reset } from '../store.js'

describe('store', () => {
  beforeEach(() => reset())

  describe('initial state', () => {
    it('has season = null', () => {
      expect(get('season')).toBe(null)
    })

    it('has revealed = false', () => {
      expect(get('revealed')).toBe(false)
    })

    it('has activeSheet = null', () => {
      expect(get('activeSheet')).toBe(null)
    })

    it('has selectedTeam = null', () => {
      expect(get('selectedTeam')).toBe(null)
    })

    it('has dataFresh = false', () => {
      expect(get('dataFresh')).toBe(false)
    })

    it('has dataStale = null', () => {
      expect(get('dataStale')).toBe(null)
    })
  })

  describe('get/set', () => {
    it('returns updated value after set', () => {
      set('season', { id: '2025-2026' })
      expect(get('season')).toEqual({ id: '2025-2026' })
    })

    it('overwrites previous value', () => {
      set('revealed', true)
      expect(get('revealed')).toBe(true)
      set('revealed', false)
      expect(get('revealed')).toBe(false)
    })
  })

  describe('unknown key guard', () => {
    it('get returns undefined for unknown key', () => {
      expect(get('bogus')).toBe(undefined)
    })

    it('set silently ignores unknown key', () => {
      set('bogus', 42)
      expect(get('bogus')).toBe(undefined)
    })

    it('on returns a no-op unsubscribe for unknown key', () => {
      const unsub = on('bogus', () => {})
      expect(typeof unsub).toBe('function')
      unsub() // should not throw
    })
  })

  describe('on — event dispatch', () => {
    it('dispatches season-loaded with correct payload', () => {
      let received = null
      const unsub = on('season', (event) => {
        received = event.detail
      })
      const data = { id: '2025-2026', teams: [] }
      set('season', data)
      expect(received).toEqual({ value: data, previous: null })
      unsub()
    })

    it('dispatches reveal-triggered event', () => {
      let received = null
      const unsub = on('revealed', (event) => {
        received = event.detail
      })
      set('revealed', true)
      expect(received).toEqual({ value: true, previous: false })
      unsub()
    })

    it('dispatches sheet-opened event', () => {
      let received = null
      const unsub = on('activeSheet', (event) => {
        received = event.detail
      })
      set('activeSheet', 'team-detail')
      expect(received).toEqual({ value: 'team-detail', previous: null })
      unsub()
    })

    it('dispatches team-selected event', () => {
      let received = null
      const unsub = on('selectedTeam', (event) => {
        received = event.detail
      })
      set('selectedTeam', 'la-rochelle')
      expect(received).toEqual({ value: 'la-rochelle', previous: null })
      unsub()
    })

    it('dispatches data-fresh event', () => {
      let received = null
      const unsub = on('dataFresh', (event) => {
        received = event.detail
      })
      set('dataFresh', true)
      expect(received).toEqual({ value: true, previous: false })
      unsub()
    })

    it('dispatches data-stale event', () => {
      let received = null
      const unsub = on('dataStale', (event) => {
        received = event.detail
      })
      const isoDate = '2026-03-20T10:00:00Z'
      set('dataStale', isoDate)
      expect(received).toEqual({ value: isoDate, previous: null })
      unsub()
    })

    it('includes previous value in payload', () => {
      let received = null
      const unsub = on('season', (event) => {
        received = event.detail
      })
      set('season', { id: 'v1' })
      set('season', { id: 'v2' })
      expect(received).toEqual({
        value: { id: 'v2' },
        previous: { id: 'v1' },
      })
      unsub()
    })
  })

  describe('unsubscribe', () => {
    it('stops receiving events after unsubscribe', () => {
      let count = 0
      const unsub = on('revealed', () => {
        count++
      })
      set('revealed', true)
      expect(count).toBe(1)
      unsub()
      set('revealed', false)
      expect(count).toBe(1)
    })
  })

  describe('reset', () => {
    it('restores initial state values', () => {
      set('season', { id: '2025-2026' })
      set('revealed', true)
      reset()
      expect(get('season')).toBe(null)
      expect(get('revealed')).toBe(false)
    })

    it('removes all listeners', () => {
      let called = false
      on('season', () => {
        called = true
      })
      reset()
      set('season', { id: 'after-reset' })
      expect(called).toBe(false)
    })
  })
})
