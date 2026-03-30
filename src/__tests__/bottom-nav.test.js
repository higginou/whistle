// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, update } from '../components/bottom-nav.js'

describe('bottom-nav', () => {
  let nav

  beforeEach(() => {
    document.body.innerHTML = ''
    nav = render(document.body, 'classements')
  })

  it('renders a <nav> with role navigation', () => {
    expect(nav.tagName).toBe('NAV')
    expect(nav.getAttribute('role')).toBe('navigation')
    expect(nav.getAttribute('aria-label')).toBe('Navigation principale')
  })

  it('renders 5 tab links', () => {
    const links = nav.querySelectorAll('a.w-bottom-nav__item')
    expect(links).toHaveLength(5)
  })

  it('marks active tab with aria-current=page', () => {
    const active = nav.querySelector('[aria-current="page"]')
    expect(active).not.toBeNull()
    expect(active.dataset.tab).toBe('classements')
  })

  it('inactive tabs have aria-current=false', () => {
    const inactive = nav.querySelectorAll('[aria-current="false"]')
    expect(inactive).toHaveLength(4)
  })

  it('update() changes active tab', () => {
    update(nav, 'projection')
    const active = nav.querySelector('[aria-current="page"]')
    expect(active.dataset.tab).toBe('projection')
  })

  it('renders labels for all tabs', () => {
    const labels = [...nav.querySelectorAll('.w-bottom-nav__label')].map(el => el.textContent)
    expect(labels).toContain('Classement')
    expect(labels).toContain('Projection')
    expect(labels).toContain('Duels')
    expect(labels).toContain('Donjon')
    expect(labels).toContain('Oracle')
  })
})
