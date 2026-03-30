import '../styles/components/bottom-nav.css'

const TABS = [
  {
    id: 'classements',
    label: 'Classement',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>',
  },
  {
    id: 'projection',
    label: 'Projection',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M2 12h3M19 12h3M12 2v3M12 19v3"/><path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
  },
  {
    id: 'duels',
    label: 'Duels',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6 2 2-6 6-2-2z"/><path d="M5 19l-2-2 6-6 2 2-6 6z"/></svg>',
  },
  {
    id: 'donjon',
    label: 'Donjon',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V9l4-6h10l4 6v12"/><path d="M9 21v-6h6v6"/><path d="M3 9h18"/></svg>',
  },
  {
    id: 'oracle',
    label: 'Oracle',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="10" ry="5"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(120 12 12)"/></svg>',
  },
]

/**
 * Render bottom nav into container.
 * Calls update() internally so active-state logic is not duplicated.
 * @param {HTMLElement} container
 * @param {string} activeTabId
 * @returns {HTMLElement} nav element
 */
export function render(container, activeTabId) {
  const nav = document.createElement('nav')
  nav.className = 'w-bottom-nav'
  nav.setAttribute('role', 'navigation')
  nav.setAttribute('aria-label', 'Navigation principale')

  // Render all items initially inactive; update() sets the active one
  nav.innerHTML = TABS.map((tab) => `
    <a
      class="w-bottom-nav__item"
      data-tab="${tab.id}"
      aria-current="false"
      href="#"
    >
      <span class="w-bottom-nav__icon">${tab.icon}</span>
      <span class="w-bottom-nav__label">${tab.label}</span>
      <span class="w-bottom-nav__glow" aria-hidden="true"></span>
    </a>
  `).join('')

  container.appendChild(nav)
  update(nav, activeTabId)
  return nav
}

/**
 * Update active tab state without re-rendering.
 * @param {HTMLElement} nav
 * @param {string} activeTabId
 */
export function update(nav, activeTabId) {
  nav.querySelectorAll('.w-bottom-nav__item').forEach((item) => {
    const isActive = item.dataset.tab === activeTabId
    item.classList.toggle('w-bottom-nav__item--active', isActive)
    item.setAttribute('aria-current', isActive ? 'page' : 'false')
  })
}

/** @returns {string[]} ordered tab IDs */
export function tabIds() {
  return TABS.map((t) => t.id)
}
