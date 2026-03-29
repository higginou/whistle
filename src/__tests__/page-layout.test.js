// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '../components/page-layout.js'

describe('page-layout', () => {
  let main

  beforeEach(() => {
    main = render()
  })

  it('returns a <main> element', () => {
    expect(main.tagName).toBe('MAIN')
  })

  it('has w-page-layout class', () => {
    expect(main.classList.contains('w-page-layout')).toBe(true)
  })

  it('contains 5 sections', () => {
    const sections = main.querySelectorAll('section')
    expect(sections).toHaveLength(5)
  })

  it('has hero section with aria-label', () => {
    const hero = main.querySelector('.w-hero-section')
    expect(hero).not.toBeNull()
    expect(hero.getAttribute('aria-label')).toBe('Equipe favorite')
  })

  it('has achievements section with aria-label', () => {
    const achievements = main.querySelector('.w-achievements-section')
    expect(achievements).not.toBeNull()
    expect(achievements.getAttribute('aria-label')).toBe('Performances du modele')
  })

  it('has reveal section', () => {
    const reveal = main.querySelector('.w-reveal-section')
    expect(reveal).not.toBeNull()
  })

  it('has standings section with h2 and aria-label', () => {
    const standings = main.querySelector('.w-standings-section')
    expect(standings).not.toBeNull()
    expect(standings.getAttribute('aria-label')).toBe('Classement')
    expect(standings.querySelector('h2').textContent).toBe('Classement')
  })

  it('has schedule section with h2 and aria-label', () => {
    const schedule = main.querySelector('.w-schedule-section')
    expect(schedule).not.toBeNull()
    expect(schedule.getAttribute('aria-label')).toBe('Prochains matchs')
    expect(schedule.querySelector('h2').textContent).toBe('Prochains matchs')
  })
})
