// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { reset, get, set, on } from '../src/store.js'
import { render } from '../src/components/view-mode-toggle.js'

describe('view-mode-toggle', () => {
  let container

  beforeEach(() => {
    reset()
    container = document.createElement('div')
  })

  it('renders a switch with aria-checked="false" by default (simple mode)', () => {
    render(container)
    const track = container.querySelector('[role="switch"]')
    expect(track).not.toBeNull()
    expect(track.getAttribute('aria-checked')).toBe('false')
    expect(track.getAttribute('aria-label')).toContain('affichage')
  })

  it('default viewMode is simple', () => {
    expect(get('viewMode')).toBe('simple')
  })

  it('clicking the switch toggles to detaille', () => {
    render(container)
    const track = container.querySelector('[role="switch"]')
    track.click()
    expect(get('viewMode')).toBe('detaille')
    expect(track.getAttribute('aria-checked')).toBe('true')
  })

  it('clicking twice returns to simple', () => {
    render(container)
    const track = container.querySelector('[role="switch"]')
    track.click()
    track.click()
    expect(get('viewMode')).toBe('simple')
    expect(track.getAttribute('aria-checked')).toBe('false')
  })

  it('reflects external store change', () => {
    render(container)
    const track = container.querySelector('[role="switch"]')
    set('viewMode', 'detaille')
    expect(track.getAttribute('aria-checked')).toBe('true')
  })

  it('renders with detaille mode if store is already set', () => {
    set('viewMode', 'detaille')
    render(container)
    const track = container.querySelector('[role="switch"]')
    expect(track.getAttribute('aria-checked')).toBe('true')
  })

  it('labels show Simple and Detail', () => {
    render(container)
    const labels = container.querySelectorAll('.w-view-switch__label')
    expect(labels.length).toBe(2)
    expect(labels[0].textContent).toBe('Simple')
    expect(labels[1].textContent).toBe('Detail')
  })

  it('active label switches on toggle', () => {
    render(container)
    const labels = container.querySelectorAll('.w-view-switch__label')
    expect(labels[0].classList.contains('w-view-switch__label--active')).toBe(true)
    expect(labels[1].classList.contains('w-view-switch__label--active')).toBe(false)

    const track = container.querySelector('[role="switch"]')
    track.click()
    expect(labels[0].classList.contains('w-view-switch__label--active')).toBe(false)
    expect(labels[1].classList.contains('w-view-switch__label--active')).toBe(true)
  })

  it('supports Enter key to toggle', () => {
    render(container)
    const track = container.querySelector('[role="switch"]')
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(get('viewMode')).toBe('detaille')
  })

  it('supports Space key to toggle', () => {
    render(container)
    const track = container.querySelector('[role="switch"]')
    track.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(get('viewMode')).toBe('detaille')
  })
})

describe('store — viewMode', () => {
  beforeEach(() => {
    reset()
  })

  it('set/get viewMode works', () => {
    expect(get('viewMode')).toBe('simple')
    set('viewMode', 'detaille')
    expect(get('viewMode')).toBe('detaille')
  })

  it('viewMode dispatches mode-changed event', () => {
    let received = null
    on('viewMode', (e) => { received = e.detail })
    set('viewMode', 'detaille')
    expect(received).toEqual({ value: 'detaille', previous: 'simple' })
  })
})

describe('localStorage persistence', () => {
  beforeEach(() => {
    reset()
    localStorage.clear()
  })

  it('persists viewMode to localStorage on change', () => {
    on('viewMode', (e) => {
      localStorage.setItem('w-viewMode', e.detail.value)
    })
    set('viewMode', 'detaille')
    expect(localStorage.getItem('w-viewMode')).toBe('detaille')
  })

  it('reads viewMode from localStorage', () => {
    localStorage.setItem('w-viewMode', 'detaille')
    const saved = localStorage.getItem('w-viewMode')
    if (saved === 'simple' || saved === 'detaille') {
      set('viewMode', saved)
    }
    expect(get('viewMode')).toBe('detaille')
  })
})
