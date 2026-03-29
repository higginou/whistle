// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '../components/empty-state.js'

describe('empty-state', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('renders the empty state with correct structure', () => {
    render(container)

    const state = container.querySelector('.w-empty-state')
    expect(state).not.toBeNull()
    expect(state.getAttribute('role')).toBe('status')
  })

  it('displays the illustration SVG', () => {
    render(container)

    const svg = container.querySelector('.w-empty-state__illustration svg')
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('displays Whistle title', () => {
    render(container)

    const title = container.querySelector('.w-empty-state__title')
    expect(title).not.toBeNull()
    expect(title.textContent).toBe('Whistle')
  })

  it('displays the friendly message', () => {
    render(container)

    const message = container.querySelector('.w-empty-state__message')
    expect(message).not.toBeNull()
    expect(message.textContent).toBe('Les donnees arrivent lundi')
  })

  it('displays the sub-message', () => {
    render(container)

    const sub = container.querySelector('.w-empty-state__sub')
    expect(sub).not.toBeNull()
    expect(sub.textContent).toContain('modele dort')
  })

  it('replaces container children', () => {
    container.innerHTML = '<span class="old">old content</span>'
    render(container)

    expect(container.querySelector('.old')).toBeNull()
    expect(container.querySelector('.w-empty-state')).not.toBeNull()
  })
})
