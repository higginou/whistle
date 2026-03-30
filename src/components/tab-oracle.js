import '../styles/components/tab-oracle.css'

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
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * Render the Oracle transparency tab.
 * @param {HTMLElement} container
 * @param {object} season
 */
export function render(container, season) {
  const matchday = season?.matchday ?? 0
  const totalMatchdays = 26
  const brierScore = season?.brierScore ?? null
  const lastUpdated = season?.lastUpdated ? formatDate(season.lastUpdated) : ''
  const predRate = computePredictionRate(season)

  const wrapper = document.createElement('div')
  wrapper.className = 'w-oracle-container'

  const levelLabel = matchday >= 20 ? 'Confirme' : matchday >= 10 ? 'Apprenti' : 'Novice'

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

      ${brierScore != null ? renderBrierCard(brierScore) : renderBrierless()}

      ${renderPredictionCard(predRate)}

      <h2 class="w-oracle-grid-title">Collection de facteurs</h2>
      <div class="w-oracle-grid">
        ${renderFactorCards()}
      </div>

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
}
