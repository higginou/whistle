import '../styles/components/tab-oracle.css'
import { get } from '../store.js'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Compute prediction accuracy from season.predictions history.
 * Each prediction entry has projections[].projectedRank compared against
 * the team's actual currentRank in season.teams at the time of evaluation.
 * @param {object} season
 * @returns {{ correct: number, total: number, rate: number }}
 */
export function computePredictionRate(season) {
  const predictions = season?.predictions
  if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
    return { correct: 0, total: 0, rate: 0 }
  }

  const currentRankById = new Map()
  if (Array.isArray(season.teams)) {
    for (const t of season.teams) {
      currentRankById.set(t.id, t.currentRank)
    }
  }

  let correct = 0
  let total = 0

  for (const pred of predictions) {
    if (!Array.isArray(pred.projections)) continue
    for (const proj of pred.projections) {
      const actual = currentRankById.get(proj.teamId)
      if (actual == null) continue
      total++
      if (proj.projectedRank === actual) correct++
    }
  }

  return { correct, total, rate: total > 0 ? correct / total : 0 }
}

/**
 * Get Brier Score quality label.
 * @param {number|null} score
 * @returns {'bon'|'moyen'|'faible'|null}
 */
export function getBrierQuality(score) {
  if (score == null) return null
  if (score < 0.25) return 'bon'
  if (score <= 0.40) return 'moyen'
  return 'faible'
}

const QUALITY_LABELS = { bon: 'Bon', moyen: 'Moyen', faible: 'Faible' }

const FACTORS = [
  {
    key: 'elo',
    name: 'Elo de base',
    desc: 'Note de depart, evolue a chaque resultat',
    rarity: 'high',
    weight: 85,
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  },
  {
    key: 'form',
    name: 'Forme recente',
    desc: '5 derniers matchs, decroissance temporelle',
    rarity: 'high',
    weight: 72,
    icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
  },
  {
    key: 'home',
    name: 'Avantage domicile',
    desc: 'Coefficient bonus equipe a domicile',
    rarity: 'mid',
    weight: 60,
    icon: '<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/><path d="M9 21v-6h6v6"/>',
  },
  {
    key: 'calendar',
    name: 'Calendrier pondere',
    desc: 'Difficulte du calendrier restant',
    rarity: 'mid',
    weight: 55,
    icon: '<circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
  },
  {
    key: 'confidence',
    name: 'Confiance',
    desc: 'Donnees + stabilite des predictions',
    rarity: 'mid',
    weight: 68,
    icon: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  },
  {
    key: 'zones',
    name: 'Zones',
    desc: 'Probabilites derivees Elo + calendrier',
    rarity: 'low',
    weight: 78,
    icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  },
]

function renderBrierCard(brierScore) {
  if (typeof brierScore !== 'number' || Number.isNaN(brierScore)) return renderBrierless()
  const quality = getBrierQuality(brierScore)
  const qualityLabel = QUALITY_LABELS[quality]
  const barPercent = Math.round((1 - brierScore) * 100)

  return `
    <section class="w-oracle-legendary" aria-label="Score Brier ${esc(String(brierScore))}, qualite ${esc(qualityLabel.toLowerCase())}">
      <div class="w-oracle-legendary-inner">
        <div class="w-oracle-legendary-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          Legendaire
        </div>
        <div class="w-oracle-legendary-row">
          <div class="w-oracle-legendary-left">
            <span class="w-oracle-legendary-label">Score Brier</span>
            <span class="w-oracle-legendary-value" aria-label="${esc(String(brierScore))}">${esc(String(brierScore))}</span>
          </div>
          <span class="w-oracle-legendary-quality w-oracle-quality--${quality}" aria-label="Qualite ${esc(qualityLabel.toLowerCase())}">${esc(qualityLabel)}</span>
        </div>
        <div class="w-oracle-legendary-bar" role="progressbar" aria-valuenow="${barPercent}" aria-valuemin="0" aria-valuemax="100" aria-label="Precision ${barPercent} pourcent">
          <div class="w-oracle-legendary-bar-track">
            <div class="w-oracle-legendary-bar-fill" data-scale="${barPercent / 100}" style="transform: scaleX(${barPercent / 100});"></div>
          </div>
          <div class="w-oracle-legendary-bar-labels">
            <span>0 (parfait)</span>
            <span>1 (aleatoire)</span>
          </div>
        </div>
      </div>
    </section>`
}

function renderBrierless() {
  return `
    <section class="w-oracle-brierless" aria-label="Score Brier non disponible">
      <div class="w-oracle-brierless-inner">
        <div class="w-oracle-brierless-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <p class="w-oracle-brierless-text">Pas encore assez de donnees — l'Oracle se reveillera apres la journee 5</p>
      </div>
    </section>`
}

function renderPredictionCard(predRate) {
  const display = predRate.total > 0
    ? `${predRate.correct}/${predRate.total}`
    : 'N/A'
  const sub = predRate.total > 0
    ? 'matchs correctement predits'
    : 'Pas encore de predictions'

  return `
    <div class="w-oracle-predict-card" aria-label="Taux de prediction: ${esc(display)}">
      <div class="w-oracle-predict-inner">
        <div>
          <div class="w-oracle-predict-label">Predictions justes</div>
          <div class="w-oracle-predict-sub">${esc(sub)}</div>
        </div>
        <span class="w-oracle-predict-value">${esc(display)}</span>
      </div>
    </div>`
}

function renderFactorCards() {
  return FACTORS.map((f, i) => `
    <article class="w-oracle-card w-oracle-card--rarity-${f.rarity}" tabindex="0" aria-label="${esc(f.name)}: ${esc(f.desc)}. Impact ${f.rarity === 'high' ? 'eleve' : f.rarity === 'mid' ? 'moyen' : 'standard'}.">
      <div class="w-oracle-card-inner">
        <div class="w-oracle-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">${f.icon}</svg>
        </div>
        <div class="w-oracle-card-name">${esc(f.name)}</div>
        <div class="w-oracle-card-desc">${esc(f.desc)}</div>
        <div class="w-oracle-card-bar" role="progressbar" aria-valuenow="${f.weight}" aria-valuemin="0" aria-valuemax="100">
          <div class="w-oracle-card-bar-fill" data-scale="${f.weight / 100}" style="transform: scaleX(${f.weight / 100});"></div>
        </div>
      </div>
    </article>`).join('')
}

function formatDate(isoString) {
  try {
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

// ─── Journal Icons (SVG paths) ───────────────────────────────────────────

const JOURNAL_ICONS = {
  correction: '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6-7.1 7.1-1.6-1.6a1 1 0 00-1.4 0"/><path d="M2 22l4-2-2-2z"/>',
  recalibration: '<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>',
}

const IMPACT_LABELS = { positive: 'Positif', neutral: 'Neutre', negative: 'Negatif' }

/**
 * Render a single journal page (grimoire entry).
 * @param {object} entry - Correction entry from JSON
 * @param {number} index - Entry index for stagger delay
 * @returns {string} HTML string
 */
function renderJournalPage(entry, index) {
  const matchdayLabel = `J${esc(String(entry.matchday))}`
  const dateLabel = formatDate(entry.date)
  const icon = JOURNAL_ICONS[entry.type] ?? JOURNAL_ICONS.correction
  const typeLabel = entry.type === 'recalibration' ? 'Recalibrage' : 'Correction'
  const impactLabel = IMPACT_LABELS[entry.impact] ?? 'Neutre'
  const oldVal = typeof entry.oldValue === 'number' && !Number.isNaN(entry.oldValue) ? esc(String(entry.oldValue)) : '?'
  const newVal = typeof entry.newValue === 'number' && !Number.isNaN(entry.newValue) ? esc(String(entry.newValue)) : '?'

  return `
    <article class="w-oracle-journal-page" aria-label="${esc(entry.type === 'recalibration' ? 'Recalibrage' : 'Correction')} du ${esc(dateLabel)}, journee ${entry.matchday}" data-journal-delay="${index}">
      <div class="w-oracle-journal-page-inner">
        <div class="w-oracle-journal-page-corner" aria-hidden="true"></div>
        <div class="w-oracle-journal-page-header">
          <div class="w-oracle-journal-page-date-block">
            <span class="w-oracle-journal-page-matchday">${matchdayLabel}</span>
            <span class="w-oracle-journal-page-date">${esc(dateLabel)}</span>
          </div>
          <span class="w-oracle-journal-type-badge w-oracle-journal-type-badge--${esc(entry.type)}">
            <svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>
            ${esc(typeLabel)}
          </span>
        </div>
        <h3 class="w-oracle-journal-page-title">${esc(entry.title)}</h3>
        <p class="w-oracle-journal-page-desc">${esc(entry.description)}</p>
        <div class="w-oracle-journal-page-footer">
          <span class="w-oracle-journal-impact w-oracle-journal-impact--${esc(entry.impact)}" aria-label="Impact ${esc(impactLabel.toLowerCase())}">${esc(impactLabel)}</span>
          <div class="w-oracle-journal-page-diff">
            <span class="w-oracle-journal-page-old">${oldVal}</span>
            <span class="w-oracle-journal-page-arrow" aria-hidden="true">&#10140;</span>
            <span class="w-oracle-journal-page-new">${newVal}</span>
            <span class="w-oracle-journal-page-param">${esc(entry.parameter)}</span>
          </div>
        </div>
      </div>
    </article>`
}

/**
 * Render the journal section with toggle and entries.
 * @param {object[]} corrections - Array of correction entries from season JSON
 * @returns {string} HTML string for the full journal section
 */
export function renderJournalSection(corrections) {
  const entries = Array.isArray(corrections) && corrections.length > 0
    ? corrections
    : null

  const pagesHtml = entries
    ? entries
        .sort((a, b) => a.matchday - b.matchday)
        .map((entry, i) => renderJournalPage(entry, i))
        .join('')
    : ''

  const emptyHtml = `
    <div class="w-oracle-journal-empty">
      <div class="w-oracle-journal-empty-quill" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
      </div>
      <p class="w-oracle-journal-empty-text">L'Oracle n'a pas encore eu besoin de se corriger — patience, ca viendra</p>
    </div>`

  const sealHtml = entries ? `
    <div class="w-oracle-journal-seal">
      <div class="w-oracle-journal-seal-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <p class="w-oracle-journal-seal-text">Scelle par l'Oracle — saison 2025-2026</p>
    </div>` : ''

  return `
    <section class="w-oracle-journal" aria-label="Journal de l'Oracle">
      <button class="w-oracle-journal-toggle" aria-expanded="false" aria-controls="w-oracle-journal-content" tabindex="0">
        <svg class="w-oracle-journal-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          <path d="M12 13V7m-3 3l3-3 3 3"/>
        </svg>
        <span>Ouvrir le grimoire</span>
      </button>
      <div id="w-oracle-journal-content" class="w-oracle-journal-content" hidden>
        <div class="w-oracle-journal-grimoire-header">
          <span class="w-oracle-journal-grimoire-title">Journal de l'Oracle</span>
          <p class="w-oracle-journal-grimoire-sub">Les corrections et recalibrages du modele</p>
        </div>
        ${entries ? pagesHtml : emptyHtml}
        ${sealHtml}
      </div>
    </section>`
}

/**
 * Render the Oracle transparency tab.
 * @param {HTMLElement} container
 * @param {object} season
 */
export function render(container, season) {
  container.innerHTML = ''

  const matchday = season?.matchday ?? 0
  const totalMatchdays = 26
  const brierScore = season?.brierScore ?? null
  const lastUpdated = season?.lastUpdated ? formatDate(season.lastUpdated) : ''
  const predRate = computePredictionRate(season)
  const corrections = season?.corrections ?? []
  const isDetaille = get('viewMode') === 'detaille'

  const wrapper = document.createElement('div')
  wrapper.className = 'w-oracle-container'

  const levelLabel = matchday >= 20 ? 'Confirme' : matchday >= 10 ? 'Apprenti' : 'Novice'

  const brierHtml = isDetaille
    ? (brierScore != null ? renderBrierCard(brierScore) : renderBrierless())
    : ''

  const factorsHtml = isDetaille
    ? `<h2 class="w-oracle-grid-title">Collection de facteurs</h2>
      <div class="w-oracle-grid">
        ${renderFactorCards()}
      </div>`
    : ''

  const journalHtml = isDetaille ? renderJournalSection(corrections) : ''

  wrapper.innerHTML = `
    <section aria-label="Transparence du modele">
      <header class="w-oracle-header">
        <div class="w-oracle-level-pill" aria-label="Niveau Oracle: ${esc(levelLabel)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          ${esc(levelLabel)}
        </div>
        <h1 class="w-oracle-title">Oracle</h1>
        <p class="w-oracle-subtitle" aria-label="Journee ${matchday} sur ${totalMatchdays}">J${esc(String(matchday))} / ${totalMatchdays}</p>
      </header>

      ${brierHtml}

      ${renderPredictionCard(predRate)}

      ${factorsHtml}

      ${journalHtml}

      ${lastUpdated ? `<footer class="w-oracle-footer" aria-label="Derniere mise a jour: ${esc(lastUpdated)}">
        <span class="w-oracle-footer-dot" aria-hidden="true"></span>
        MAJ: ${esc(lastUpdated)}
      </footer>` : ''}
    </section>`

  container.appendChild(wrapper)

  // Animate cards flip-reveal + bar fills (skip if reduced motion)
  requestAnimationFrame(() => {
    const prefersReduced = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const cards = wrapper.querySelectorAll('.w-oracle-card')
    cards.forEach((card, i) => {
      card.style.opacity = '0'
      setTimeout(() => {
        card.classList.add('w-oracle-card--revealed')
        card.style.opacity = ''
      }, 100 + i * 100)
    })

    // Animate bar fills via scaleX (only transform, never width)
    const fills = wrapper.querySelectorAll('.w-oracle-card-bar-fill, .w-oracle-legendary-bar-fill')
    fills.forEach((fill, i) => {
      const target = fill.dataset.scale || '1'
      fill.style.transform = 'scaleX(0)'
      setTimeout(() => { fill.style.transform = `scaleX(${target})` }, 500 + i * 100)
    })
  })

  // ── Journal toggle (expand/collapse) ──
  const toggle = wrapper.querySelector('.w-oracle-journal-toggle')
  const content = wrapper.querySelector('#w-oracle-journal-content')
  if (toggle && content) {
    const label = toggle.querySelector('span')

    const handleToggle = () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true'
      toggle.setAttribute('aria-expanded', String(!expanded))

      if (expanded) {
        content.hidden = true
        if (label) label.textContent = 'Ouvrir le grimoire'
      } else {
        content.hidden = false
        if (label) label.textContent = 'Refermer le grimoire'

        // Stagger animate journal pages (80ms between entries)
        const prefersReduced = typeof window.matchMedia === 'function'
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!prefersReduced) {
          const pages = content.querySelectorAll('.w-oracle-journal-page')
          pages.forEach((page, i) => {
            page.style.opacity = '0'
            page.style.transform = 'translateY(12px)'
            setTimeout(() => {
              page.style.transition = 'opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
              page.style.opacity = '1'
              page.style.transform = 'translateY(0)'
            }, 80 * i)
          })
        }
      }
    }

    toggle.addEventListener('click', handleToggle)
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleToggle()
      }
    })
  }
}
