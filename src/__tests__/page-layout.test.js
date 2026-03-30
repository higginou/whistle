// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '../components/page-layout.js'

describe('page-layout', () => {
  let shell

  beforeEach(() => {
    shell = render()
  })

  it('returns a <div> app shell', () => {
    expect(shell.tagName).toBe('DIV')
    expect(shell.classList.contains('w-app-shell')).toBe(true)
  })

  it('contains an app header', () => {
    const header = shell.querySelector('.w-app-header')
    expect(header).not.toBeNull()
    expect(header.tagName).toBe('HEADER')
  })

  it('header has logo', () => {
    const logo = shell.querySelector('.w-app-header__logo')
    expect(logo).not.toBeNull()
    expect(logo.textContent).toContain('Whistle')
  })

  it('header has Succès button with aria-label', () => {
    const btn = shell.querySelector('.w-succes-btn')
    expect(btn).not.toBeNull()
    expect(btn.getAttribute('aria-label')).toMatch(/Succ/)
  })

  it('contains a tab viewport', () => {
    const viewport = shell.querySelector('.w-tab-viewport')
    expect(viewport).not.toBeNull()
    expect(viewport.getAttribute('role')).toBe('main')
  })
})
