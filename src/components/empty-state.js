import '../styles/components/empty-state.css'

/**
 * Render the empty state screen (offline, no cache).
 * Variante C: illustration ludique — terrain rugby + ballon + "zzz".
 * @param {HTMLElement} container
 */
export function render(container) {
  const section = document.createElement('div')
  section.className = 'w-empty-state'
  section.setAttribute('role', 'status')
  section.setAttribute('aria-label', 'Aucune donnee disponible')

  section.innerHTML = `
    <div class="w-empty-state__illustration">
      <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="80" cy="80" r="72" fill="#f3e8ff" />
        <rect x="40" y="50" width="80" height="55" rx="4" fill="#e9d5ff" stroke="#c4b5fd" stroke-width="1.5"/>
        <line x1="80" y1="50" x2="80" y2="105" stroke="#c4b5fd" stroke-width="1" stroke-dasharray="3 2"/>
        <circle cx="80" cy="77.5" r="10" fill="none" stroke="#c4b5fd" stroke-width="1"/>
        <g transform="translate(80, 77.5) rotate(-30)">
          <ellipse rx="14" ry="8" fill="#6d28d9" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#fff" stroke-width="1.2"/>
          <line x1="-4" y1="-3" x2="-4" y2="3" stroke="#fff" stroke-width="0.8"/>
          <line x1="0" y1="-4.5" x2="0" y2="4.5" stroke="#fff" stroke-width="0.8"/>
          <line x1="4" y1="-3" x2="4" y2="3" stroke="#fff" stroke-width="0.8"/>
        </g>
        <circle cx="115" cy="45" r="2" fill="#c4b5fd" opacity="0.6"/>
        <circle cx="50" cy="42" r="1.5" fill="#c4b5fd" opacity="0.4"/>
        <circle cx="125" cy="70" r="1.5" fill="#c4b5fd" opacity="0.5"/>
        <text x="108" y="42" font-family="Nunito, sans-serif" font-weight="800" font-size="12" fill="#a78bfa" opacity="0.7">z</text>
        <text x="118" y="35" font-family="Nunito, sans-serif" font-weight="800" font-size="14" fill="#a78bfa" opacity="0.5">z</text>
        <text x="126" y="26" font-family="Nunito, sans-serif" font-weight="800" font-size="10" fill="#a78bfa" opacity="0.3">z</text>
      </svg>
    </div>
    <div class="w-empty-state__text">
      <h1 class="w-empty-state__title">Whistle</h1>
      <p class="w-empty-state__message">Les donnees arrivent lundi</p>
      <p class="w-empty-state__sub">Le modele dort entre les journees de championnat</p>
    </div>
  `

  container.replaceChildren(section)
}
