import '../styles/components/page-layout.css'
import { render as renderViewModeToggle } from './view-mode-toggle.js'

const TROPHY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true" width="18" height="18">
  <path d="M8 21h8M12 17v4M17 3H7l1 7a4 4 0 008 0l1-7z"/>
  <path d="M17 3c0 0 2 0 2 3s-2 4-2 4M7 3c0 0-2 0-2 3s2 4 2 4"/>
</svg>`

/**
 * Render app shell: header (logo + Succès button) + tab viewport.
 * @returns {HTMLElement}
 */
export function render() {
  const shell = document.createElement('div')
  shell.className = 'w-app-shell'

  shell.innerHTML = `
    <header class="w-app-header" role="banner">
      <span class="w-app-header__logo" aria-label="Whistle">Whistle</span>
      <div class="w-app-header__right"></div>
    </header>
    <div class="w-tab-viewport" role="main" aria-label="Classements"></div>
  `

  // Render toggle + success button into header right section
  const headerRight = shell.querySelector('.w-app-header__right')
  renderViewModeToggle(headerRight)

  const succesBtn = document.createElement('button')
  succesBtn.className = 'w-succes-btn'
  succesBtn.setAttribute('aria-label', 'Succès — 0 obtenus')
  succesBtn.setAttribute('type', 'button')
  succesBtn.innerHTML = `${TROPHY_SVG}<span class="w-succes-btn__badge" aria-hidden="true" hidden>0</span>`
  headerRight.appendChild(succesBtn)

  return shell
}
