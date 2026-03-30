import '../styles/components/tab-placeholder.css'

/**
 * Render a "coming soon" placeholder into container.
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.title — tab name
 * @param {string} options.description — feature description
 */
export function render(container, { title, description }) {
  const el = document.createElement('div')
  el.className = 'w-tab-placeholder'

  el.innerHTML = `
    <div class="w-tab-placeholder__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    </div>
    <h2 class="w-tab-placeholder__title">${title}</h2>
    <p class="w-tab-placeholder__desc">${description}</p>
  `

  container.appendChild(el)
  return el
}
