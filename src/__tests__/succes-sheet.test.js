// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { render, open, close, updateBadge } from '../components/succes-sheet.js'

// jsdom doesn't implement showModal/close on <dialog>.
// Polyfill MUST go in beforeAll (not at module top-level — imports are hoisted
// so the prototype assignment would run before jsdom is set up).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.removeAttribute('open')
  })
})

const MOCK_SEASON = {
  teams: [{ id: 'la-rochelle', name: 'La Rochelle', currentRank: 3, projectedRank: 2, trend: 'up' }],
  predictions: [],
}

describe('succes-sheet', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button class="w-succes-btn"><span class="w-succes-btn__badge" hidden>0</span></button>'
    render(document.body)
  })

  it('renders a <dialog> into container', () => {
    expect(document.querySelector('dialog.w-succes-sheet')).not.toBeNull()
  })

  it('open() calls showModal', () => {
    open(MOCK_SEASON)
    const dialog = document.querySelector('dialog.w-succes-sheet')
    expect(dialog.showModal).toHaveBeenCalled()
  })

  it('close() removes open attribute', () => {
    open(MOCK_SEASON)
    close()
    const dialog = document.querySelector('dialog.w-succes-sheet')
    expect(dialog.hasAttribute('open')).toBe(false)
  })

  it('updateBadge() sets badge text and shows it', () => {
    updateBadge(document.body, 2)
    const badge = document.querySelector('.w-succes-btn__badge')
    expect(badge.textContent).toBe('2')
    expect(badge.hidden).toBe(false)
  })

  it('updateBadge() hides badge when count is 0', () => {
    updateBadge(document.body, 0)
    const badge = document.querySelector('.w-succes-btn__badge')
    expect(badge.hidden).toBe(true)
  })
})
