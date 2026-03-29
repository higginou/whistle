// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * These tests verify the reveal-button component's render function
 * by testing the DOM output in a jsdom environment.
 * We mock the animation engine since motion/mini requires a real browser.
 */

// Mock the animation engine
vi.mock('../src/animation/engine.js', () => ({
  revealProjection: vi.fn(() => Promise.resolve()),
  resetProjection: vi.fn(() => Promise.resolve()),
}))

// Mock the CSS import
vi.mock('../src/styles/components/reveal-button.css', () => ({}))

describe('reveal-button', () => {
  let container
  let renderButton
  let store

  beforeEach(async () => {
    vi.resetModules()

    // Re-import store fresh for isolation
    store = await import('../src/store.js')
    store.reset()

    // Set up a minimal season in the store
    store.set('season', {
      id: '2025-2026',
      teams: [
        { id: 'toulouse', name: 'Toulouse', currentRank: 1, projectedRank: 1, elo: 1600, confidence: 0.8, trend: 'stable' },
        { id: 'la-rochelle', name: 'La Rochelle', currentRank: 2, projectedRank: 3, elo: 1550, confidence: 0.7, trend: 'down' },
      ],
    })

    // Import the component
    const mod = await import('../src/components/reveal-button.js')
    renderButton = mod.render

    // Create a fresh container
    container = document.createElement('div')
    document.body.innerHTML = ''
    document.body.appendChild(container)

    // Add some fake rank-rows for the animation to find
    const row1 = document.createElement('div')
    row1.className = 'w-rank-row'
    row1.dataset.teamId = 'toulouse'
    const pos1 = document.createElement('span')
    pos1.className = 'w-rank-row__position'
    pos1.textContent = '1'
    row1.appendChild(pos1)
    document.body.appendChild(row1)

    const row2 = document.createElement('div')
    row2.className = 'w-rank-row'
    row2.dataset.teamId = 'la-rochelle'
    const pos2 = document.createElement('span')
    pos2.className = 'w-rank-row__position'
    pos2.textContent = '2'
    row2.appendChild(pos2)
    document.body.appendChild(row2)
  })

  it('renders a button with text "Reveler la projection"', () => {
    renderButton(container)
    const btn = container.querySelector('button')
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('Reveler la projection')
  })

  it('button has type="button"', () => {
    renderButton(container)
    const btn = container.querySelector('button')
    expect(btn.type).toBe('button')
  })

  it('button has w-reveal-button class', () => {
    renderButton(container)
    const btn = container.querySelector('button')
    expect(btn.classList.contains('w-reveal-button')).toBe(true)
  })

  it('sets disabled and aria-busy during animation', async () => {
    renderButton(container)
    const btn = container.querySelector('button')

    // Click the button
    btn.click()

    // During animation the button should be disabled with aria-busy
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.textContent).toBe('Projection en cours...')

    // Wait for the mocked animation to resolve
    await vi.waitFor(() => {
      expect(btn.textContent).toBe('Rejouer')
    })
  })

  it('sets text to "Rejouer" after animation completes', async () => {
    renderButton(container)
    const btn = container.querySelector('button')

    btn.click()

    await vi.waitFor(() => {
      expect(btn.textContent).toBe('Rejouer')
    })

    expect(btn.disabled).toBe(false)
    expect(btn.getAttribute('aria-busy')).toBeNull()
  })

  it('sets store revealed to true after animation', async () => {
    renderButton(container)
    const btn = container.querySelector('button')

    btn.click()

    await vi.waitFor(() => {
      expect(store.get('revealed')).toBe(true)
    })
  })
})
